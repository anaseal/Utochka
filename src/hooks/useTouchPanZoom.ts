import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';

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
export const useTouchPanZoom = (
  containerRef: RefObject<HTMLDivElement | null>,
  zoom: number,
  onZoomChange: (delta: number) => void,
  cancelStroke: () => void,
) => {
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const gestureRef = useRef<{ startDist: number; startZoom: number; lastMid: Point } | null>(null);
  // Всегда актуальный zoom для расчёта дельты внутри колбэков.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const isMultiTouch = useCallback(() => pointersRef.current.size >= 2, []);

  const onPointerDownCapture = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2) {
      e.stopPropagation();
      cancelStroke();
      const [a, b] = Array.from(pointersRef.current.values());
      gestureRef.current = { startDist: distance(a, b), startZoom: zoomRef.current, lastMid: midpoint(a, b) };
    }
  }, [cancelStroke]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const gesture = gestureRef.current;
    const container = containerRef.current;
    if (pointersRef.current.size < 2 || !gesture || !container) return;

    const [a, b] = Array.from(pointersRef.current.values());
    const newZoom = gesture.startZoom * (distance(a, b) / gesture.startDist);
    const delta = newZoom - zoomRef.current;
    if (delta !== 0) {
      onZoomChange(delta);
      // Одно физическое движение двух пальцев — это ДВА отдельных pointermove
      // (по одному на pointerId каждого пальца), которые нередко приходят в
      // одном тике до того, как React закоммитит zoom из первого onZoomChange.
      // Без этой строки второе событие считало бы дельту от того же
      // устаревшего zoomRef.current (обновляется только раз за рендер, см.
      // строку выше), удваивая изменение — отсюда дёрганье и скачки zoom
      // при pinch на тач-устройствах.
      zoomRef.current = newZoom;
    }

    const mid = midpoint(a, b);
    container.scrollLeft -= mid.x - gesture.lastMid.x;
    container.scrollTop -= mid.y - gesture.lastMid.y;
    gesture.lastMid = mid;
  }, [containerRef, onZoomChange]);

  const releasePointer = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;
  }, []);

  return { onPointerDownCapture, onPointerMove, releasePointer, isMultiTouch };
};
