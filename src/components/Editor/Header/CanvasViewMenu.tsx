import { RotateCw } from 'lucide-react';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { CanvasViewOptions } from './CanvasViewOptions';
import { CanvasOrientation } from './Header.types';

// Вид полотна (поворот на 90° и зеркальное отражение) — не инструмент
// рисования и не часть режима плетения, а общая настройка «как полотно
// лежит перед тобой» (см. spec.md, «Поворот и отражение полотна»): доступна
// всегда, в любой технике и в любом режиме, но живёт в одном месте, а не
// дублируется. Единая кнопка раскрывает мини-попап с двумя независимыми
// тумблерами — та же визуальная схема, что и у Mirror Mode (MirrorMenu).
// Собственный класс canvas-view-menu поверх общего mirror-menu — зацепка для
// ≤479.98px, где эта кнопка из строки убрана, а её пункты (CanvasViewOptions)
// показывает меню «Функции»; по одному .mirror-menu отличить её от кнопки
// зеркала было бы нельзя.
export const CanvasViewMenu = ({
  orientation, onToggleOrientation, flipped, onToggleFlip,
}: {
  orientation: CanvasOrientation;
  onToggleOrientation: () => void;
  flipped: boolean;
  onToggleFlip: () => void;
}) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();
  const active = orientation === 'horizontal' || flipped;

  return (
    <div className="mirror-menu canvas-view-menu" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`tool-btn ${active ? 'tool-btn--active' : ''}`}
        title="Canvas view: rotate or mirror"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <RotateCw size={14} />
      </button>

      {open && (
        <div className="mirror-menu__panel" role="menu">
          <CanvasViewOptions
            orientation={orientation}
            onToggleOrientation={onToggleOrientation}
            flipped={flipped}
            onToggleFlip={onToggleFlip}
          />
        </div>
      )}
    </div>
  );
};
