import type { ComponentType } from 'react';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { SilyankaIcon, CrossWeaveIcon, PeyoteIcon, LoomIcon, WeaveSwitchIcon } from './icons';
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
  { id: 'loom', label: 'loom', title: 'Bead loom weaving', Icon: LoomIcon },
];

interface TechniqueMenuProps {
  technique: Technique;
  onTechniqueChange: (technique: Technique) => void;
}

// Заменяет прежний инлайн-блок .technique-switch (2 жёстко закодированные
// кнопки): третья техника (Peyote) в pill из кнопок-в-ряд уже не
// помещается, поэтому — попап-меню тем же приёмом, что и MirrorMenu/
// WeaveHelp (useDismissablePopup): триггер — обычная иконка-кнопка
// (.tool-btn, подсветка только пока меню открыто), название текущей
// техники видно в title и по активному пункту в открытом меню, а не
// подписью на самой кнопке. По клику — список из четырёх пунктов, стиль
// пунктов — как у MirrorMenu (.mirror-menu__item).
//
// Иконка триггера — фиксированный WeaveSwitchIcon (icons.tsx), а НЕ current.Icon:
// иконка текущей техники (Silyanka/Peyote/Loom...) менялась бы при каждом
// переключении, и кнопка-триггер визуально прыгала бы вместо того, чтобы быть
// узнаваемым постоянным символом действия «сменить технику» — тем же приёмом,
// что и FlipHorizontal у MirrorMenu (фиксированная иконка действия, не
// текущего состояния).
export const TechniqueMenu = ({ technique, onTechniqueChange }: TechniqueMenuProps) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();
  const current = TECHNIQUES.find(t => t.id === technique) ?? TECHNIQUES[0];

  return (
    <div className="technique-menu" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className={`tool-btn tool-btn--lg ${open ? 'tool-btn--active' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${current.label}: ${current.title}`}
      >
        <WeaveSwitchIcon size={18} />
      </button>

      {open && (
        <div className="technique-menu__panel" role="menu">
          {TECHNIQUES.map(({ id, label, title, Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={technique === id}
              className={`technique-menu__item ${technique === id ? 'technique-menu__item--active' : ''}`}
              title={title}
              onClick={() => {
                onTechniqueChange(id);
                setOpen(false);
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
