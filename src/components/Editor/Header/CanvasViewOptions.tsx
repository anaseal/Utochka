import { FlipHorizontal, MoveHorizontal, Check } from 'lucide-react';
import { CanvasOrientation } from './Header.types';

interface CanvasViewOptionsProps {
  orientation: CanvasOrientation;
  onToggleOrientation: () => void;
  flipped: boolean;
  onToggleFlip: () => void;
}

// Два пункта «как полотно лежит перед тобой» — сами по себе, без кнопки и
// попапа вокруг. Вынесены из CanvasViewMenu, потому что на ≤479.98px кнопка
// из строки хедера убрана (место ушло под два ровных ряда, см. Header.css), а
// пункты переехали в меню «Функции» (HeaderOverflowMenu) — разметка одна на
// оба места, копии логики не заводим.
export const CanvasViewOptions = ({
  orientation, onToggleOrientation, flipped, onToggleFlip,
}: CanvasViewOptionsProps) => (
  <>
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
  </>
);
