import { RotateCw, FlipHorizontal, MoveHorizontal, Check } from 'lucide-react';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { CanvasOrientation } from './Header.types';

// Вид полотна (поворот на 90° и зеркальное отражение) — не инструмент
// рисования и не часть режима плетения, а общая настройка «как полотно
// лежит перед тобой» (см. spec.md, «Поворот и отражение полотна»): доступна
// всегда, в любой технике и в любом режиме, но живёт в одном месте, а не
// дублируется. Единая кнопка раскрывает мини-попап с двумя независимыми
// тумблерами — та же визуальная схема, что и у Mirror Mode (MirrorMenu).
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
    <div className="mirror-menu" ref={ref}>
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
          <button
            onClick={onToggleOrientation}
            className={`mirror-menu__item ${orientation === 'horizontal' ? 'mirror-menu__item--active' : ''}`}
            role="menuitemcheckbox"
            aria-checked={orientation === 'horizontal'}
          >
            <MoveHorizontal size={12} className="mirror-menu__item-icon" />
            <span className="mirror-menu__item-label">Lay horizontally</span>
            {orientation === 'horizontal' && <Check size={12} className="mirror-menu__item-check" />}
          </button>
          <button
            onClick={onToggleFlip}
            className={`mirror-menu__item ${flipped ? 'mirror-menu__item--active' : ''}`}
            role="menuitemcheckbox"
            aria-checked={flipped}
          >
            <FlipHorizontal size={12} className="mirror-menu__item-icon" />
            <span className="mirror-menu__item-label">Flip</span>
            {flipped && <Check size={12} className="mirror-menu__item-check" />}
          </button>
        </div>
      )}
    </div>
  );
};
