import { useState, useCallback, useMemo, useRef, Dispatch, SetStateAction } from 'react';
import { BEAD_THEME } from '../config/theme';
import { usePersistedState } from './usePersistedState';
import { PendantPlacement, PendantChain } from '../types/pendant';
import { Thread } from '../types/thread';

const MAX_HISTORY = 30;
const RECENT_LIMIT = BEAD_THEME.ui.recentColorsLimit;
const HEX_RE = /^#[0-9a-f]{6}$/i;

const isDesignMap = (v: unknown): v is Record<string, string> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(c => typeof c === 'string');
};

export type DrawingTool = 'pencil' | 'eraser' | 'flood-fill' | 'stamp' | 'pendant-chain' | 'thread';

// Единица истории: снимок сетки, подвесок, цепочек-подвесок И ниток разом —
// один Undo/Redo откатывает все четыре состояния синхронно (они рисуются
// одним мазком/жестом, например заливка может задеть сетку, подвеску и
// цепочку разом).
interface HistorySnapshot {
  designMap: Record<string, string>;
  pendants: PendantPlacement[];
  chains: PendantChain[];
  threads: Thread[];
}

export const useDrawing = (
  initialColor: string,
  basePalette: readonly string[],
  pendantPlacements: PendantPlacement[],
  setPendantPlacements: Dispatch<SetStateAction<PendantPlacement[]>>,
  pendantChains: PendantChain[],
  setPendantChains: Dispatch<SetStateAction<PendantChain[]>>,
  threads: Thread[],
  setThreads: Dispatch<SetStateAction<Thread[]>>,
  storageNamespace: string,
) => {
  const recentStorageKey = `${storageNamespace}:recentColors`;
  const designStorageKey = `${storageNamespace}:designMap`;

  const [activeColor, setActiveColorState] = useState(initialColor);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pencil');

  // paintBead/paintBeadFast читают активные цвет/инструмент через рефы, а не
  // напрямую из замыкания — иначе смена цвета в палитре меняла бы ссылку на
  // paintBead на каждый клик, а через applyPaint/handlePointerEnter это
  // цепочкой пробивало бы memo у BeadGrid (см. BeadGrid.tsx), пересобирая
  // весь список из тысяч бисерин просто от выбора цвета, без какого-либо
  // рисования.
  const activeColorRef = useRef(activeColor);
  activeColorRef.current = activeColor;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(recentStorageKey);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((c): c is string => typeof c === 'string' && HEX_RE.test(c))
        .slice(0, RECENT_LIMIT);
    } catch {
      return [];
    }
  });

  const setActiveColor = useCallback((color: string) => {
    setActiveColorState(color);
  }, []);

  const commitRecentColor = useCallback((color: string) => {
    if (!HEX_RE.test(color)) return;
    if (basePalette.includes(color)) return;
    setRecentColors(prev => {
      if (prev[0] === color) return prev;
      const next = [color, ...prev.filter(c => c !== color)].slice(0, RECENT_LIMIT);
      try { localStorage.setItem(recentStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [basePalette, recentStorageKey]);
  const [designMap, setDesignMap] = usePersistedState<Record<string, string>>(
    designStorageKey, {}, isDesignMap,
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  const preStrokeRef = useRef<HistorySnapshot>({ designMap: {}, pendants: [], chains: [], threads: [] });

  // Буфер текущего мазка карандашом/ластиком: null = стереть бисерину.
  // paintBeadFast пишет сюда, а не в designMap напрямую — setDesignMap на
  // каждую задетую протяжкой бисерину пересобирал бы весь BeadGrid (тысячи
  // элементов) на каждый пиксель протяжки. Вызывающая сторона (CanvasView)
  // сама красит бисерину в DOM по возвращённому цвету, а весь буфер разом
  // коммитится в designMap в stopDrawing — тем же приёмом, каким уже
  // избегают лишних setState во время live-жеста при pinch-zoom
  // (см. useTouchPanZoom).
  const strokeChangesRef = useRef<Map<string, string | null>>(new Map());

  const pushSnapshot = useCallback((snapshot: HistorySnapshot) => {
    setPast(prev => {
      const next = [...prev, snapshot];
      return next.length > MAX_HISTORY ? next.slice(1) : next;
    });
    setFuture([]);
  }, []);

  const startDrawing = useCallback(() => {
    preStrokeRef.current = { designMap, pendants: pendantPlacements, chains: pendantChains, threads };
    setIsDrawing(true);
  }, [designMap, pendantPlacements, pendantChains, threads]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      const pre = preStrokeRef.current;
      const changes = strokeChangesRef.current;
      const hasStagedChanges = changes.size > 0;
      if (hasStagedChanges) {
        setDesignMap((prev) => {
          const next = { ...prev };
          for (const [id, color] of changes) {
            if (color === null) delete next[id];
            else next[id] = color;
          }
          return next;
        });
        changes.clear();
      }
      if (
        hasStagedChanges || pre.designMap !== designMap || pre.pendants !== pendantPlacements ||
        pre.chains !== pendantChains || pre.threads !== threads
      ) {
        pushSnapshot(pre);
      }
    }
    setIsDrawing(false);
  }, [isDrawing, designMap, pendantPlacements, pendantChains, threads, pushSnapshot, setDesignMap]);

  const paintBead = useCallback((id: string) => {
    if (activeToolRef.current === 'eraser') {
      setDesignMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setDesignMap((prev) => ({
        ...prev,
        [id]: activeColorRef.current
      }));
    }
  }, []);

  // Быстрый путь для протяжки (см. strokeChangesRef выше) — не трогает React
  // state, только копит изменение и отдаёт итоговый цвет вызывающей стороне
  // для прямой записи в DOM. undefined в возврате означает «стереть»
  // (совпадает по смыслу с color? в BeadView — рисуется дефолтный цвет типа).
  const paintBeadFast = useCallback((id: string): string | undefined => {
    const color = activeToolRef.current === 'eraser' ? undefined : activeColorRef.current;
    strokeChangesRef.current.set(id, color ?? null);
    return color;
  }, []);

  const clearAll = useCallback(() => {
    const hasDesign = Object.keys(designMap).length > 0;
    const hasPendantColors = pendantPlacements.some(p => Object.keys(p.colorMap).length > 0);
    const hasChainColors = pendantChains.some(c => Object.keys(c.colorMap).length > 0);
    const hasThreads = threads.length > 0;
    if (!hasDesign && !hasPendantColors && !hasChainColors && !hasThreads) return;
    pushSnapshot({ designMap, pendants: pendantPlacements, chains: pendantChains, threads });
    if (hasDesign) setDesignMap({});
    if (hasPendantColors) {
      setPendantPlacements(prev => prev.map(p => (
        Object.keys(p.colorMap).length === 0 ? p : { ...p, colorMap: {} }
      )));
    }
    if (hasChainColors) {
      setPendantChains(prev => prev.map(c => (
        Object.keys(c.colorMap).length === 0 ? c : { ...c, colorMap: {} }
      )));
    }
    if (hasThreads) setThreads([]);
  }, [designMap, pendantPlacements, pendantChains, threads, pushSnapshot, setPendantPlacements, setPendantChains, setThreads]);

  // Управляемая трансформация Design Map (например, пересчёт при смене ширины).
  // Снимок сохраняется в историю — результат можно отменить через Undo.
  const remapDesignMap = useCallback((
    fn: (m: Record<string, string>) => Record<string, string>,
  ) => {
    const next = fn(designMap);
    if (next === designMap) return;
    pushSnapshot({ designMap, pendants: pendantPlacements, chains: pendantChains, threads });
    setDesignMap(next);
  }, [designMap, pendantPlacements, pendantChains, threads, pushSnapshot]);

  // Одновременное изменение сетки, подвесок, цепочек И ниток одним шагом
  // истории (например, заливка, которая может задеть обычные бусины, бусины
  // подвески и бусины цепочки за один клик; нитка коммитится тем же путём —
  // целиком на pointerup, см. ThreadLayer/CanvasView).
  const applyPatch = useCallback((
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: ((p: PendantPlacement[]) => PendantPlacement[]) | null,
    chainsFn: ((c: PendantChain[]) => PendantChain[]) | null = null,
    threadsFn: ((t: Thread[]) => Thread[]) | null = null,
  ) => {
    const nextDesignMap = designMapFn ? designMapFn(designMap) : designMap;
    const nextPendants = pendantsFn ? pendantsFn(pendantPlacements) : pendantPlacements;
    const nextChains = chainsFn ? chainsFn(pendantChains) : pendantChains;
    const nextThreads = threadsFn ? threadsFn(threads) : threads;
    if (
      nextDesignMap === designMap && nextPendants === pendantPlacements &&
      nextChains === pendantChains && nextThreads === threads
    ) return;
    pushSnapshot({ designMap, pendants: pendantPlacements, chains: pendantChains, threads });
    if (nextDesignMap !== designMap) setDesignMap(nextDesignMap);
    if (nextPendants !== pendantPlacements) setPendantPlacements(nextPendants);
    if (nextChains !== pendantChains) setPendantChains(nextChains);
    if (nextThreads !== threads) setThreads(nextThreads);
  }, [
    designMap, pendantPlacements, pendantChains, threads,
    pushSnapshot, setPendantPlacements, setPendantChains, setThreads,
  ]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    setFuture(f => [{ designMap, pendants: pendantPlacements, chains: pendantChains, threads }, ...f]);
    const snapshot = past[past.length - 1];
    setDesignMap(snapshot.designMap);
    setPendantPlacements(snapshot.pendants);
    setPendantChains(snapshot.chains);
    setThreads(snapshot.threads);
    setPast(p => p.slice(0, -1));
  }, [past, designMap, pendantPlacements, pendantChains, threads, setPendantPlacements, setPendantChains, setThreads]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setPast(p => [...p, { designMap, pendants: pendantPlacements, chains: pendantChains, threads }]);
    const snapshot = future[0];
    setDesignMap(snapshot.designMap);
    setPendantPlacements(snapshot.pendants);
    setPendantChains(snapshot.chains);
    setThreads(snapshot.threads);
    setFuture(f => f.slice(1));
  }, [future, designMap, pendantPlacements, pendantChains, threads, setPendantPlacements, setPendantChains, setThreads]);

  // useMemo — та же причина, что и в usePendants.ts/usePendantChains.ts/
  // useThreads.ts: без него drawingControls был бы новым объектом на любой
  // рендер App (даже не связанный с рисованием), а он используется целиком
  // в зависимостях других useCallback (например, makeSymmetric в
  // useSilyankaProject.ts) — нестабильная ссылка каскадом пробивала бы memo
  // у BeadGrid на любое действие в приложении.
  return useMemo(() => ({
    activeColor,
    setActiveColor,
    commitRecentColor,
    activeTool,
    setActiveTool,
    recentColors,
    designMap,
    isDrawing,
    paintBead,
    paintBeadFast,
    startDrawing,
    stopDrawing,
    clearAll,
    remapDesignMap,
    applyPatch,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }), [
    activeColor, setActiveColor, commitRecentColor, activeTool, setActiveTool, recentColors,
    designMap, isDrawing, paintBead, paintBeadFast, startDrawing, stopDrawing, clearAll,
    remapDesignMap, applyPatch, undo, redo, past.length, future.length,
  ]);
};
