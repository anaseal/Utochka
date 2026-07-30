import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import './SectionHelp.css';

// Ширина пузырька — фиксированная и не завязана на ширину сайдбара (см. ниже,
// почему сам пузырёк портализован): 220px читается свободнее, чем прежние
// 140px, подобранные только чтобы влезть в узкий сайдбар.
const BUBBLE_WIDTH = 220;
const VIEWPORT_MARGIN = 8;

// Пузырёк рендерится через createPortal в document.body с position:fixed
// (тот же приём, что и .pendant-drag-ghost — см. PendantsCatalogSection.tsx),
// а не CSS-якорем (position:absolute от иконки внутри сайдбара). Раньше
// пузырёк был потомком .sidebar__body (overflow-y:auto, из-за чего браузер
// делает overflow-x тоже auto) — стоило ему при появлении хоть немного не
// уместиться по ширине в узком сайдбаре, как весь сайдбар получал
// горизонтальный скролл и визуально «дёргался» при каждом наведении на «?».
// Портал полностью выводит пузырёк из скролл-геометрии сайдбара: положение
// считается один раз при наведении/фокусе через getBoundingClientRect, а не
// CSS-стороной (left/right), поэтому одному и тому же компоненту больше не
// нужно два варианта якоря под разные положения «?» в разных секциях.
export const SectionHelp = ({ text }: { text: string }) => {
  const id = useId();
  const iconRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = useCallback(() => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      window.innerWidth - BUBBLE_WIDTH - VIEWPORT_MARGIN,
    );
    setPos({ top: rect.bottom + 8, left });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span className="section-help">
      <button
        ref={iconRef}
        type="button"
        className="section-help__icon"
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <HelpCircle size={15} />
      </button>
      {pos && createPortal(
        <span
          className="section-help__bubble"
          role="tooltip"
          id={id}
          style={{ top: pos.top, left: pos.left, width: BUBBLE_WIDTH }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
};
