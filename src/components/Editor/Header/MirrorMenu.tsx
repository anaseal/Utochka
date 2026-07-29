import { FlipHorizontal, Check } from 'lucide-react';
import { MakeSymmetricIcon } from './icons';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';

// Единая кнопка Mirror Mode раскрывает мини-попап с двумя связанными
// зеркальными операциями — переключателем режима и одноразовым действием
// "Сделать симметричным" — вместо отдельной иконки для второго действия.
export const MirrorMenu = ({
  mirrorMode, setMirrorMode, onMakeSymmetric, canMakeSymmetric,
}: {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
}) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();

  return (
    <div className="mirror-menu" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`tool-btn ${mirrorMode ? 'tool-btn--active' : ''}`}
        title="Mirror Mode (M)"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FlipHorizontal size={14} />
      </button>

      {open && (
        <div className="mirror-menu__panel" role="menu">
          <button
            onClick={() => setMirrorMode(!mirrorMode)}
            className={`mirror-menu__item ${mirrorMode ? 'mirror-menu__item--active' : ''}`}
            role="menuitemcheckbox"
            aria-checked={mirrorMode}
          >
            <FlipHorizontal size={12} className="mirror-menu__item-icon" />
            <span className="mirror-menu__item-label">Mirror Mode</span>
            {mirrorMode && <Check size={12} className="mirror-menu__item-check" />}
          </button>
          <button
            onClick={() => { onMakeSymmetric(); setOpen(false); }}
            className="mirror-menu__item"
            disabled={!canMakeSymmetric}
            title="Fills the missing mirrored half of the current design"
          >
            <MakeSymmetricIcon size={12} className="mirror-menu__item-icon" />
            <span className="mirror-menu__item-label">Make symmetric</span>
          </button>
        </div>
      )}
    </div>
  );
};
