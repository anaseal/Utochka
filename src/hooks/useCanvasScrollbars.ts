import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../utils/clamp';
import { useFrameThrottle } from './useFrameThrottle';

// Тач-скроллбар .canvas__svg (см. CanvasScrollbars.tsx) — общий для
// CanvasView и CrossWeaveCanvasView, как и остальные общие механики холста
// (см. spec.md, раздел 4.2). Нативный browser-scrollbar на мобильных
// WebKit/Blink не является перетаскиваемым пальцем виджетом (в отличие от
// десктопа), а единственная тач-альтернатива — двупальцевый жест
// (useTouchPanZoom) — неудобна для точной прокрутки. Этот хук считает
// геометрию бегунка по обеим осям и даёт драг поверх Pointer Events, не
// трогая сам скролл-контейнер иначе как через его нативные scrollLeft/scrollTop
// (те же свойства, что пишет и useTouchPanZoom во время пинча, и колесо
// мыши) — источник правды на скролл один, этот хук лишь ещё один способ его
// подвинуть.

interface AxisMetrics {
  visible: boolean;
  /** px вдоль оси скролла — длина бегунка. */
  thumbSize: number;
  /** px вдоль оси скролла — сдвиг бегунка от начала трека. */
  thumbOffset: number;
}

const HIDDEN_AXIS: AxisMetrics = { visible: false, thumbSize: 0, thumbOffset: 0 };

// Минимальная длина бегунка — иначе на сильно зумленном холсте (scrollWidth
// намного больше clientWidth) пропорциональный бегунок стал бы тоньше
// разумного тач-таргета. Тот же приём, что у нативных scrollbar браузеров.
const MIN_THUMB_PX = 32;

const computeAxis = (viewSize: number, contentSize: number, scrollPos: number): AxisMetrics => {
  if (viewSize <= 0 || contentSize <= viewSize + 1) return HIDDEN_AXIS;
  const rawThumb = (viewSize * viewSize) / contentSize;
  const thumbSize = Math.min(viewSize, Math.max(rawThumb, MIN_THUMB_PX));
  const travel = viewSize - thumbSize;
  const scrollRange = contentSize - viewSize;
  const thumbOffset = scrollRange > 0 ? (scrollPos / scrollRange) * travel : 0;
  return { visible: true, thumbSize, thumbOffset };
};

type Axis = 'x' | 'y';

interface DragState {
  axis: Axis;
  startClient: number;
  startScroll: number;
  travel: number;
  scrollRange: number;
}

export const useCanvasScrollbars = (containerRef: RefObject<HTMLDivElement | null>) => {
  const [x, setX] = useState<AxisMetrics>(HIDDEN_AXIS);
  const [y, setY] = useState<AxisMetrics>(HIDDEN_AXIS);
  const shouldThrottle = useFrameThrottle();
  const dragRef = useRef<DragState | null>(null);

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setX(computeAxis(el.clientWidth, el.scrollWidth, el.scrollLeft));
    setY(computeAxis(el.clientHeight, el.scrollHeight, el.scrollTop));
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    recompute();

    const onScroll = () => {
      if (shouldThrottle()) return;
      recompute();
    };
    el.addEventListener('scroll', onScroll);

    // clientWidth/Height контейнера меняются на resize/повороте экрана,
    // scrollWidth/Height — на зум (в т.ч. напрямую в DOM во время пинча,
    // useTouchPanZoom, мимо React) — оба случая ловит ResizeObserver, если
    // смотреть и на контейнер, и на сам <svg> внутри него.
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    const svg = el.querySelector('svg');
    if (svg) ro.observe(svg);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [containerRef, recompute, shouldThrottle]);

  // Драг бегунка — окно, не сам бегунок: то же самое решение, что и в
  // PendantsSidebar (окно продолжает получать move/up, даже если палец
  // уехал за пределы маленькой полосы бегунка).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const el = containerRef.current;
      if (!drag || !el || drag.travel <= 0) return;
      const clientPos = drag.axis === 'x' ? e.clientX : e.clientY;
      const delta = clientPos - drag.startClient;
      const nextScroll = clamp(
        drag.startScroll + (delta / drag.travel) * drag.scrollRange,
        0,
        drag.scrollRange,
      );
      if (drag.axis === 'x') el.scrollLeft = nextScroll;
      else el.scrollTop = nextScroll;
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [containerRef]);

  const beginDrag = useCallback((axis: Axis, e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const metrics = axis === 'x' ? x : y;
    const viewSize = axis === 'x' ? el.clientWidth : el.clientHeight;
    const contentSize = axis === 'x' ? el.scrollWidth : el.scrollHeight;
    dragRef.current = {
      axis,
      startClient: axis === 'x' ? e.clientX : e.clientY,
      startScroll: axis === 'x' ? el.scrollLeft : el.scrollTop,
      travel: viewSize - metrics.thumbSize,
      scrollRange: contentSize - viewSize,
    };
  }, [containerRef, x, y]);

  return { x, y, beginDrag };
};
