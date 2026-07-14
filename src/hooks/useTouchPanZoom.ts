import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { APP_CONSTRAINTS } from '../config/theme';
import { clamp } from '../utils/clamp';

interface Point { x: number; y: number; }

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Двупальцевый жест на холсте (панорама + pinch-zoom) — общий для CanvasView
// и CrossWeaveCanvasView. Нужен только из-за touch-action: none на
// .canvas__svg (см. spec.md, «Ввод: мышь и тач») — без него рисование
// пальцем не работало бы (см. useDrawing/BeadView), но заодно отключает
// нативный скролл/pinch браузера, поэтому оба жеста приходится
// реализовывать вручную поверх Pointer Events.
//
// Один палец — обычное рисование, эта логика не трогается (она на
// onPointerDown/onPointerEnter самих бусин). Как только опускается второй
// палец, onPointerDownCapture (вешать на самый внешний элемент холста, чтобы
// capture-фаза сработала раньше вложенных onPointerDown) гасит событие,
// не давая ему дойти до бусины (иначе второй палец красил бы бисерину под
// собой) и до onPointerDown контейнера (иначе конфликтовал бы с драгом
// штампа), и отменяет уже начатый мазок первого пальца через cancelStroke.
//
// Zoom во время жеста НЕ идёт через React state: на каждый pointermove
// пишем width/height <svg> и scroll контейнера напрямую в DOM (тот же приём,
// что и в ReferenceWindow при драге/ресайзе — см. spec.md, «Reference
// Window»). Иначе setState на каждый тик пинча (а тиков минимум два на одно
// физическое движение — по одному pointermove на каждый палец) перерисовывал
// бы всё дерево от App (Header, PendantsSidebar, сотни BeadView) и, так как
// zoom персистентный (usePersistedState), синхронно писал бы в localStorage
// на каждый кадр — именно это вызывало подвисания холста на мобилке при
// pinch. React state (и localStorage) коммитится один раз через onZoomCommit,
// когда жест заканчивается (счётчик пальцев падает ниже 2).
export const useTouchPanZoom = (
  containerRef: RefObject<HTMLDivElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  zoom: number,
  dim: { w: number; h: number },
  onZoomCommit: (newZoom: number) => void,
  cancelStroke: () => void,
) => {
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const gestureRef = useRef<{ startDist: number; startZoom: number; lastMid: Point } | null>(null);
  // "Живой" zoom текущего жеста (см. комментарий выше) — актуален только
  // между началом и коммитом жеста, синхронизируется с zoom prop вне жеста.
  const liveZoomRef = useRef(zoom);
  const dimRef = useRef(dim);
  dimRef.current = dim;

  const isMultiTouch = useCallback(() => pointersRef.current.size >= 2, []);

  const onPointerDownCapture = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2) {
      e.stopPropagation();
      cancelStroke();
      const [a, b] = Array.from(pointersRef.current.values());
      // Третий палец, опустившийся поверх уже идущего жеста, стартует не от
      // устаревшего React-пропа zoom (он не обновлялся с начала пинча), а от
      // текущего живого значения — иначе масштаб дёрнулся бы назад.
      const baseZoom = gestureRef.current ? liveZoomRef.current : zoom;
      liveZoomRef.current = baseZoom;
      gestureRef.current = { startDist: distance(a, b), startZoom: baseZoom, lastMid: midpoint(a, b) };
    }
  }, [cancelStroke, zoom]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const gesture = gestureRef.current;
    const container = containerRef.current;
    const svg = svgRef.current;
    if (pointersRef.current.size < 2 || !gesture || !container || !svg) return;

    const [a, b] = Array.from(pointersRef.current.values());
    const rawZoom = gesture.startZoom * (distance(a, b) / gesture.startDist);
    const newZoom = clamp(rawZoom, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom);
    liveZoomRef.current = newZoom;
    const { w, h } = dimRef.current;
    svg.setAttribute('width', String(w * newZoom));
    svg.setAttribute('height', String(h * newZoom));

    const mid = midpoint(a, b);
    container.scrollLeft -= mid.x - gesture.lastMid.x;
    container.scrollTop -= mid.y - gesture.lastMid.y;
    gesture.lastMid = mid;
  }, [containerRef, svgRef]);

  const releasePointer = useCallback((e: React.PointerEvent) => {
    const hadGesture = pointersRef.current.size >= 2 && gestureRef.current !== null;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      if (hadGesture) onZoomCommit(liveZoomRef.current);
      gestureRef.current = null;
    }
  }, [onZoomCommit]);

  return { onPointerDownCapture, onPointerMove, releasePointer, isMultiTouch };
};
