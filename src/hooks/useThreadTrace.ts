import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Thread, ThreadCommitOptions, ThreadLiveCursor, ThreadTrace, threadEndBeadId,
} from '../types/thread';
import { ThreadAnchor } from '../utils/beadPositions';
import { ThreadStyleSource } from '../utils/threadStyle';
import { findBeadsAlongSegment } from '../utils/threadGeometry';
import { BEAD_THEME } from '../config/theme';
import { DrawingTool } from './useDrawing';
import { ToBeadCoords } from './useBeadCoords';
import { useFrameThrottle } from './useFrameThrottle';

// Вся логика инструмента «нитка», общая для двух техник с ниткой — силянки и
// крестика (у Peyote и Loom нитки нет, см. spec.md, «Нитка»): набор точек
// кликами, магнит к ближайшей бусине, перепрокладка конца существующей нитки
// за ручку, коммит и отмена. Живёт одним хуком, а не копией внутри CanvasView
// и CrossWeaveCanvasView: копии разошлись бы на первой же правке инструмента.
//
// Различия техник вынесены в параметры и не требуют ветвлений внутри:
//  - hitboxRadius берётся из своей темы (бусины разного размера);
//  - expandRun есть только у силянки (цепочки-подвески, см. expandChainRun);
//  - strand — только у крестика (две нитки одновременно), у силянки undefined,
//    и тогда он просто не попадает ни в коммит (см. useThreads.addThread), ни
//    в стиль превью (color приоритетнее strand, см. threadColorStyle).

interface UseThreadTraceOptions {
  activeTool: DrawingTool;
  threads: Thread[];
  /** id → координаты по всем слоям холста: магнит работает по любой бусине. */
  positionIndex: Map<string, ThreadAnchor>;
  hitboxRadius: number;
  toBeadCoords: ToBeadCoords;
  /** Второй палец на холсте отменяет магнит — жест уходит в панораму/zoom. */
  isMultiTouch: () => boolean;
  onAddThread: (beadIds: string[], options?: ThreadCommitOptions) => void;
  onRerouteThreadEnd: (threadId: string, end: 'start' | 'end', traceBeadIds: string[]) => void;
  // «Кисть» нитки — цвет/прозрачность/нить, которыми ляжет СЛЕДУЮЩАЯ нитка
  // (см. Header.tsx). Примитивами, а не объектом: объект-литерал был бы новым
  // на каждый рендер и пробивал бы мемоизацию колбэков ниже.
  brushColor: string;
  brushOpacity: number;
  brushStrand?: 1 | 2;
  /**
   * Достраивание пути между двумя кликами, перескочившими через бусины одного
   * физически непрерывного ряда (у силянки — цепочка-подвеска: её бисерины
   * лежат на провисающей дуге, а не на прямой, поэтому чисто геометрическая
   * проверка потеряла бы внутренние). null — прыжок не внутри такого ряда.
   */
  expandRun?: (fromId: string, toId: string) => string[] | null;
}

export const useThreadTrace = ({
  activeTool,
  threads,
  positionIndex,
  hitboxRadius,
  toBeadCoords,
  isMultiTouch,
  onAddThread,
  onRerouteThreadEnd,
  brushColor,
  brushOpacity,
  brushStrand,
  expandRun,
}: UseThreadTraceOptions) => {
  const [trace, setTrace] = useState<ThreadTrace | null>(null);
  const [cursor, setCursor] = useState<ThreadLiveCursor | null>(null);
  // Ожидание решения «клик или драг» на ручке конца нитки (ThreadLayer):
  // pointerDown только сеет этот ref, само beginReroute откладывается до
  // превышения порога смещения на pointerMove; если порог не превышен к
  // pointerUp — это был обычный клик по бусине-якорю, и он уходит в addPoint
  // как любой другой клик (иначе нельзя было бы начать новую нить с той же
  // бусины, где закончилась предыдущая — ручка всегда перехватывала бы клик).
  const handleDragRef = useRef<{
    threadId: string;
    end: 'start' | 'end';
    startClient: { x: number; y: number };
    pointerId: number;
    dragging: boolean;
  } | null>(null);

  const cancel = useCallback(() => {
    setTrace(null);
    setCursor(null);
  }, []);

  const clearCursor = useCallback(() => setCursor(null), []);

  const cancelHandleDrag = useCallback(() => {
    handleDragRef.current = null;
  }, []);

  // Уход с инструмента посреди незавершённой протяжки (например, горячей
  // клавишей) не должен оставлять висящий пунктирный превью-путь. Сброс — по
  // документированному приёму «корректировка состояния во время рендера»
  // (https://react.dev/learn/you-might-not-need-an-effect), а не эффектом:
  // эффект дал бы лишний кадр, в котором превью уже неактуально, но ещё на
  // экране, и упирался бы в react-hooks/set-state-in-effect.
  const [toolAtLastRender, setToolAtLastRender] = useState(activeTool);
  if (activeTool !== toolAtLastRender) {
    setToolAtLastRender(activeTool);
    if (activeTool !== 'thread') {
      setTrace(null);
      setCursor(null);
    }
  }

  // Коммит трассировки — по двойному клику или Enter, а не по завершению
  // drag-жеста: точное перетаскивание через мелкие бусины неудобно (особенно
  // на тач), поэтому нитка прокладывается отдельными кликами.
  //
  // Запись нитки (onAddThread/onRerouteThreadEnd — это setState уровня App)
  // идёт здесь, в обработчике, а не внутри апдейтера setTrace: React вызывает
  // апдейтер уже в фазе рендера, и чужой setState оттуда — «Cannot update a
  // component while rendering a different component» в консоли. Тот же вывод
  // записан в useSilyankaProject.toggleTaperRowsLinked. Значение берётся из
  // замыкания, а не из апдейтера: commit зовут только из обработчиков (Enter,
  // двойной клик, повторный клик по последней точке), и там trace актуален.
  const commit = useCallback(() => {
    if (trace) {
      if (trace.rerouting) {
        if (trace.beadIds.length >= 2) {
          onRerouteThreadEnd(trace.rerouting.threadId, trace.rerouting.end, trace.beadIds.slice(1));
        }
      } else if (trace.beadIds.length >= 2) {
        onAddThread(trace.beadIds, { strand: brushStrand, color: brushColor, opacity: brushOpacity });
      }
    }
    setTrace(null);
    setCursor(null);
  }, [trace, onAddThread, onRerouteThreadEnd, brushStrand, brushColor, brushOpacity]);

  /**
   * Единая точка входа для трассировки: каждый явный клик по бусине зовёт эту
   * функцию — и от сетки, и от слоёв подвесок/цепочек (магнит работает по
   * любой бусине холста).
   *
   * Повторный клик по уже последней точке не добавляет дубль, а завершает
   * нитку тем же путём, что двойной клик/Enter (коммитит при ≥2 точках, иначе
   * черновик отбрасывается) — иначе клик по той же бусине выглядел бы так,
   * будто ничего не происходит, и пользователь застревал бы в незавершённой
   * трассировке.
   *
   * Прыжок между двумя точками достраивается промежуточными бусинами: сначала
   * expandRun (бусины одного физически непрерывного ряда, приоритетнее —
   * см. комментарий к опции), затем геометрия (findBeadsAlongSegment) — любая
   * бусина любого слоя, физически лежащая на прямой между кликами, тоже должна
   * попасть в путь, как будто по ней кликнули отдельно.
   */
  const addPoint = useCallback((id: string) => {
    if (trace && trace.beadIds[trace.beadIds.length - 1] === id) {
      commit();
      return;
    }
    setTrace((prev) => {
      if (!prev) return { beadIds: [id], rerouting: null };
      const lastId = prev.beadIds[prev.beadIds.length - 1];
      if (lastId === id) return prev;
      const run = expandRun?.(lastId, id);
      if (run) return { ...prev, beadIds: [...prev.beadIds, ...run] };
      const between = findBeadsAlongSegment(
        positionIndex, lastId, id, new Set(prev.beadIds), hitboxRadius,
      );
      return { ...prev, beadIds: [...prev.beadIds, ...between, id] };
    });
  }, [trace, commit, expandRun, positionIndex, hitboxRadius]);

  /**
   * Отменяет последнюю точку (крестик на её месте в ThreadLayer) —
   * трассировка не прерывается, просто «шаг назад». Стартовую точку так не
   * убрать (крестик виден только когда точек ≥ 2), для полной отмены — Escape.
   */
  const removeLastPoint = useCallback(() => {
    setTrace((prev) => {
      if (!prev || prev.beadIds.length < 2) return prev;
      return { ...prev, beadIds: prev.beadIds.slice(0, -1) };
    });
  }, []);

  // Хватание ручки конца существующей нитки — сеет трассировку якорной
  // бусиной того конца; сам якорь не входит в итоговый traceBeadIds
  // (см. useThreads.rerouteThreadEnd — там slice(1) убирает первую точку).
  const beginReroute = useCallback((threadId: string, end: 'start' | 'end') => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    setTrace({ beadIds: [threadEndBeadId(thread, end)], rerouting: { threadId, end } });
  }, [threads]);

  const handleEndPointerDown = useCallback((
    e: React.PointerEvent, threadId: string, end: 'start' | 'end',
  ) => {
    handleDragRef.current = {
      threadId, end, startClient: { x: e.clientX, y: e.clientY }, pointerId: e.pointerId, dragging: false,
    };
  }, []);

  const handleEndPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = handleDragRef.current;
    if (!drag || drag.dragging || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startClient.x;
    const dy = e.clientY - drag.startClient.y;
    const { handleDragThreshold, handleDragThresholdTouch } = BEAD_THEME.threadDefaults;
    const threshold = e.pointerType === 'touch' ? handleDragThresholdTouch : handleDragThreshold;
    if (Math.hypot(dx, dy) > threshold) {
      drag.dragging = true;
      beginReroute(drag.threadId, drag.end);
    }
  }, [beginReroute]);

  // Отпускание без превышения порога — обычный клик по бусине-якорю: уходит в
  // addPoint как любой другой клик (начнёт новую нить, если трассировки нет,
  // иначе добавит точку/закоммитит по обычным правилам).
  const handleEndPointerUp = useCallback((e: React.PointerEvent) => {
    const drag = handleDragRef.current;
    handleDragRef.current = null;
    if (!drag || drag.pointerId !== e.pointerId || drag.dragging) return;
    const thread = threads.find((t) => t.id === drag.threadId);
    if (!thread) return;
    addPoint(threadEndBeadId(thread, drag.end));
  }, [threads, addPoint]);

  // Аналог findNearestNode, но по всем слоям сразу (см. positionIndex) —
  // магнит нитки не ограничен узлами сетки. null, если ближайшая бусина
  // дальше hitboxRadius (курсор в пустоте, примагничивать не к чему).
  const findNearestAnchor = useCallback((point: { x: number; y: number }) => {
    let nearestId: string | null = null;
    let nearestPos: ThreadAnchor | null = null;
    let bestDist = Infinity;
    for (const [id, pos] of positionIndex) {
      const dx = pos.x - point.x;
      const dy = pos.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        nearestId = id;
        nearestPos = pos;
      }
    }
    if (!nearestPos || bestDist > hitboxRadius * hitboxRadius) return null;
    return { id: nearestId as string, pos: nearestPos };
  }, [positionIndex, hitboxRadius]);

  const shouldThrottle = useFrameThrottle();

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (activeTool !== 'thread' || !trace || isMultiTouch()) return;
    if (shouldThrottle()) return;
    const beadPoint = toBeadCoords(e.clientX, e.clientY);
    if (!beadPoint) return;
    const nearest = findNearestAnchor(beadPoint);
    setCursor({ pos: nearest?.pos ?? beadPoint, magnetId: nearest?.id ?? null });
  }, [activeTool, trace, isMultiTouch, shouldThrottle, toBeadCoords, findNearestAnchor]);

  // Enter коммитит трассировку (как двойной клик), Escape сбрасывает её, не
  // выходя из инструмента — активны только пока есть незавершённая протяжка,
  // чтобы не мешать другим горячим клавишам (Ctrl+Z и т. п.).
  useEffect(() => {
    if (activeTool !== 'thread' || !trace) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, trace, commit, cancel]);

  // Цвет незавершённой трассировки (ThreadLayer → liveTraceSource): для
  // перепрокладки конца — стиль самой перепрокладываемой нитки (коммит его не
  // меняет), для новой нитки — текущая кисть.
  const liveTraceSource: ThreadStyleSource | undefined = trace
    ? (trace.rerouting
      ? threads.find((t) => t.id === trace.rerouting?.threadId)
      : { color: brushColor, opacity: brushOpacity, strand: brushStrand })
    : undefined;

  return {
    trace,
    cursor,
    liveTraceSource,
    addPoint,
    commit,
    cancel,
    clearCursor,
    cancelHandleDrag,
    removeLastPoint,
    handlePointerMove,
    handleEndPointerDown,
    handleEndPointerMove,
    handleEndPointerUp,
  };
};
