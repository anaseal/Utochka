import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import './SectionHelp.css';

// Ширина пузырька — фиксированная и не завязана на ширину сайдбара (см. ниже,
// почему сам пузырёк портализован): 220px подобраны под удобную длину строки
// подсказки, а не под то, чтобы влезть в узкую панель.
const BUBBLE_WIDTH = 220;
const VIEWPORT_MARGIN = 8;
const BUBBLE_GAP = 8;
// Сколько места под иконкой нужно, чтобы раскрывать пузырёк вниз. Значение —
// высота самой длинной подсказки проекта (около восьми строк по 220px в
// ширину плюс поля): порог, а не измеренная высота, потому что решение о
// направлении принимается до того, как пузырёк отрисован (см. ниже).
const MIN_SPACE_BELOW = 180;

// Пузырёк рендерится через createPortal в document.body с position:fixed
// (тот же приём, что и .pendant-drag-ghost — см. PendantsCatalogSection.tsx),
// а не CSS-якорем (position:absolute от иконки внутри сайдбара). Потомком
// .sidebar__body пузырьку быть нельзя: там overflow-y:auto (из-за чего браузер
// делает overflow-x тоже auto), и стоит пузырьку при появлении хоть немного не
// уместиться по ширине в узком сайдбаре, как весь сайдбар получает
// горизонтальный скролл и визуально «дёргается» при каждом наведении на «?».
// Портал полностью выводит пузырёк из скролл-геометрии сайдбара: положение
// считается один раз при наведении/фокусе через getBoundingClientRect, а не
// CSS-стороной (left/right), поэтому одному компоненту хватает одного якоря
// на все положения «?» в разных секциях.
interface BubblePos {
  left: number;
  // Задана ровно одна из пары: пузырёк либо висит под иконкой (top), либо
  // стоит над ней (bottom). См. show ниже.
  top?: number;
  bottom?: number;
  above: boolean;
}

export const SectionHelp = ({ text }: { text: string }) => {
  const id = useId();
  const iconRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<BubblePos | null>(null);

  const show = useCallback(() => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      window.innerWidth - BUBBLE_WIDTH - VIEWPORT_MARGIN,
    );
    // «?» у нижнего края окна (кнопка «Reset all» в подвале панели) раскрывает
    // подсказку вверх. Вверх она привязывается за НИЖНИЙ край (bottom), а не
    // за верхний: высота пузырька в этот момент неизвестна — он ещё не
    // отрисован, — а растущий вверх блок её и не требует. Иначе пришлось бы
    // мерить пузырёк после появления и сдвигать, то есть показывать кадр в
    // неверном месте.
    const above = window.innerHeight - rect.bottom < MIN_SPACE_BELOW;
    setPos({
      left,
      above,
      top: above ? undefined : rect.bottom + BUBBLE_GAP,
      bottom: above ? window.innerHeight - rect.top + BUBBLE_GAP : undefined,
    });
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
          className={`section-help__bubble${pos.above ? ' section-help__bubble--above' : ''}`}
          role="tooltip"
          id={id}
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: BUBBLE_WIDTH }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
};
