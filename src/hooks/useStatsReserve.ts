import { useEffect, useRef, useState } from 'react';

// Резервирует место под .stats (CanvasStats, position: fixed поверх холста)
// в высоте .canvas__svg — раньше это место было захардкожено в CSS (140px /
// 110px, см. CanvasView.css), но при большом числе цветов .stats__list
// переносится на 2-3 строки и панель вырастает выше этой константы, начиная
// наезжать на нижние ряды бисера (особенно заметно на мобильном, где ширина
// уже и цвета переносятся чаще). Меряем фактическое расстояние от верхнего
// края панели до низа viewport через ResizeObserver вместо угадывания константы.
export const useStatsReserve = (fallback: number) => {
  const statsRef = useRef<HTMLElement>(null);
  const [reserve, setReserve] = useState(fallback);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const update = () => setReserve(window.innerHeight - el.getBoundingClientRect().top + 8);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { statsRef, reserve };
};
