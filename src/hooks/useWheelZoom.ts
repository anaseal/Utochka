import { useEffect, useRef, RefObject } from 'react';
import { APP_CONSTRAINTS } from '../config/theme';
import { clamp } from '../utils/clamp';
import { computeZoomToPointScroll } from '../utils/zoomToPoint';

// Ctrl+wheel zoom холста — общий для CanvasView и CrossWeaveCanvasView.
//
// Зумирует к точке под курсором: width/height <svg> и scrollLeft/scrollTop
// контейнера пишутся напрямую в DOM (тот же приём, что и в useTouchPanZoom,
// см. комментарий там), а не через React state → эффект. Если сначала
// закоммитить zoom в state и подвинуть scroll уже после ре-рендера, браузер
// клампит scrollLeft/Top по ещё старому (не увеличенному) scrollWidth/Height
// первого кадра — курсор на мгновение «уезжает» от точки. onZoomChange
// вызывается следом лишь для того, чтобы синхронизировать персистентный
// React state (usePersistedState) — коммит проставляет те же значения,
// что уже лежат в DOM, без визуального скачка.
export const useWheelZoom = (
  containerRef: RefObject<HTMLDivElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  zoom: number,
  dim: { w: number; h: number },
  onZoomChange: (delta: number) => void,
) => {
  // "Живой" zoom между тиками — трекпад может выдать несколько wheel-событий
  // за один ещё не закоммиченный React-кадр, и oldZoom для формулы должен
  // быть тем, что реально сейчас в DOM (после предыдущего тика), а не
  // устаревшим пропом (тот же liveZoomRef, что и в useTouchPanZoom).
  // Синхронизация — эффектом по смене zoom, а не в теле рендера: иначе
  // чужой ре-рендер между wheel-тиком и коммитом его onZoomChange затирал бы
  // уже продвинутое локальное значение старым пропом.
  const liveZoomRef = useRef(zoom);
  useEffect(() => {
    liveZoomRef.current = zoom;
  }, [zoom]);
  const dimRef = useRef(dim);
  dimRef.current = dim;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const oldZoom = liveZoomRef.current;
      const delta = -e.deltaY * 0.005;
      const newZoom = clamp(oldZoom + delta, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom);
      const svg = svgRef.current;
      if (svg && newZoom !== oldZoom) {
        const containerRect = container.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        // containerLeft/Top — позиция контейнера на экране (скролл её не
        // меняет). paddingLeft/Top — расстояние от неё до <svg> при
        // scrollLeft/Top = 0, т.е. реальный CSS-padding карточки
        // (.canvas__svg) — вычислено через текущий скролл, а не взято из
        // стилей напрямую.
        const { scrollLeft, scrollTop } = computeZoomToPointScroll({
          containerLeft: containerRect.left,
          containerTop: containerRect.top,
          svgLeft: svgRect.left,
          svgTop: svgRect.top,
          paddingLeft: svgRect.left - containerRect.left + container.scrollLeft,
          paddingTop: svgRect.top - containerRect.top + container.scrollTop,
          clientX: e.clientX,
          clientY: e.clientY,
          oldZoom,
          newZoom,
        });
        const { w, h } = dimRef.current;
        svg.setAttribute('width', String(w * newZoom));
        svg.setAttribute('height', String(h * newZoom));
        container.scrollLeft = scrollLeft;
        container.scrollTop = scrollTop;
      }
      liveZoomRef.current = newZoom;

      // Клампнутая дельта, а не сырая: onZoomChange (App.tsx) сам делает
      // clamp(prev + delta, ...) — передавая уже посчитанный newZoom-oldZoom,
      // получаем на коммите ровно то значение, что только что записали в
      // DOM, даже если liveZoomRef успел на тик разойтись с ещё не
      // закоммиченным React state.
      onZoomChange(newZoom - oldZoom);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, svgRef, onZoomChange]);
};
