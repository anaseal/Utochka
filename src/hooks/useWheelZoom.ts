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
// первого кадра — курсор на мгновение «уезжает» от точки.
//
// onZoomChange коммитит React state не на каждый тик, а раз в
// WHEEL_COMMIT_DELAY_MS после последнего тика серии. Трекпад отдаёт по
// несколько десятков wheel-событий в секунду — setState на каждое из них
// перерисовывал бы всё дерево от App (Header, сотни BeadView), из-за чего
// зум дёргался и подтормаживал. Тот же паттерн уже чинили для pinch-zoom в
// useTouchPanZoom, там гейтом служит естественный конец жеста (pointerup);
// у wheel отдельного события окончания нет, поэтому используется таймер.
// Дельты копятся и коммитятся одной суммой — телескопически она равна
// разнице между zoom в начале и в конце серии, независимо от клампинга
// на промежуточных тиках.
const WHEEL_COMMIT_DELAY_MS = 120;

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

    let pendingDelta = 0;
    let commitTimer: ReturnType<typeof setTimeout> | null = null;

    const commit = () => {
      commitTimer = null;
      if (pendingDelta !== 0) {
        onZoomChange(pendingDelta);
        pendingDelta = 0;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const oldZoom = liveZoomRef.current;
      const delta = -e.deltaY * 0.005;
      const newZoom = clamp(oldZoom + delta, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom);
      const svg = svgRef.current;
      if (svg && newZoom !== oldZoom) {
        // containerLeft/Top — позиция контейнера на экране (скролл её не
        // меняет). paddingLeft/Top — расстояние от неё до <svg> при
        // scrollLeft/Top = 0, т.е. реальный CSS-padding карточки
        // (.canvas__svg) — вычислено через текущий скролл, а не взято из
        // стилей напрямую.
        const containerRect = container.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
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

      pendingDelta += newZoom - oldZoom;
      if (commitTimer !== null) clearTimeout(commitTimer);
      commitTimer = setTimeout(commit, WHEEL_COMMIT_DELAY_MS);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      // Размонтирование посреди серии (например, переключение техники) не
      // должно терять уже накопленный, но ещё не закоммиченный zoom — DOM к
      // этому моменту уже перерисован, а без флаша при следующем монтировании
      // persisted state откатит его обратно к старому значению.
      if (commitTimer !== null) {
        clearTimeout(commitTimer);
        commit();
      }
    };
  }, [containerRef, svgRef, onZoomChange]);
};
