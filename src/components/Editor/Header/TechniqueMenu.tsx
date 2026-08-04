import type { ComponentType } from 'react';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { SilyankaIcon, CrossWeaveIcon, PeyoteIcon } from './icons';
import { Technique } from './Header.types';

interface TechniqueOption {
  id: Technique;
  label: string;
  title: string;
  Icon: ComponentType<{ size?: number }>;
}

const TECHNIQUES: TechniqueOption[] = [
  { id: 'silyanka', label: 'sylianka', title: 'Traditional Ukrainian beadwork', Icon: SilyankaIcon },
  { id: 'crossWeave', label: 'RAW', title: 'Right-Angle Weave', Icon: CrossWeaveIcon },
  { id: 'peyote', label: 'peyote', title: 'Peyote stitch', Icon: PeyoteIcon },
];

interface TechniqueMenuProps {
  technique: Technique;
  onTechniqueChange: (technique: Technique) => void;
  // Peyote не поддерживает режим плетения (см. spec.md, «Peyote») — пункт
  // блокируется, пока режим включён, иначе можно было бы зайти в плетение
  // на другой технике и переключиться на Peyote, оставшись в
  // необслуживаемом состоянии (кнопка входа в режим для Peyote скрыта,
  // см. Header.tsx).
  weaveMode: boolean;
}

// Заменяет прежний инлайн-блок .technique-switch (2 жёстко закодированные
// кнопки): третья техника (Peyote) в pill из кнопок-в-ряд уже не
// помещается, поэтому — попап-меню тем же приёмом, что и MirrorMenu/
// HeaderOverflowMenu (useDismissablePopup): кнопка-триггер с иконкой
// текущей техники, по клику — список из трёх пунктов.
export const TechniqueMenu = ({ technique, onTechniqueChange, weaveMode }: TechniqueMenuProps) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();
  const current = TECHNIQUES.find(t => t.id === technique) ?? TECHNIQUES[0];

  return (
    <div className="technique-menu" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className="technique-menu__trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={current.title}
      >
        <current.Icon size={25} />
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="technique-menu__panel" role="menu">
          {TECHNIQUES.map(({ id, label, title, Icon }) => {
            const disabled = id === 'peyote' && weaveMode;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={technique === id}
                className={`technique-menu__item ${technique === id ? 'technique-menu__item--active' : ''}`}
                disabled={disabled}
                title={disabled ? 'Exit weave mode to switch to Peyote' : title}
                onClick={() => {
                  onTechniqueChange(id);
                  setOpen(false);
                }}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
