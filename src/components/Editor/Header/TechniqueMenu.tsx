import type { ComponentType } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { SilyankaIcon, CrossWeaveIcon, PeyoteIcon, LoomIcon, WeaveSwitchIcon, SettingsPanelIcon } from './icons';
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
  // Ниже — только для секции «Изделие» (.technique-menu__narrow-extra), которую
  // видно на ≤479.98px: там кнопка правой панели из строки хедера убрана
  // (см. Header.css), и открыть панель можно только отсюда.
  weaveMode: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
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
export const TechniqueMenu = ({
  technique, onTechniqueChange, weaveMode, sidebarOpen, onToggleSidebar,
}: TechniqueMenuProps) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();
  const current = TECHNIQUES.find(t => t.id === technique) ?? TECHNIQUES[0];

  // Секция «Изделие» видна только на ≤479.98px и только в рисовании: в режиме
  // плетения панель закрыта самим App при входе в режим, и пункт «открыть
  // панель» там ни к чему не ведёт.
  const narrowExtra = !weaveMode;

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
        {/* Два глифа, видимость переключает медиазапрос (Header.css): на
            ≤479.98px в панели, кроме выбора техники, лежат подвески и настройки
            сетки, и «переплетение нитей» её содержимого уже не описывает.
            Размер иконки в lucide — проп, а не CSS, а JS-брейкпоинтов в хедере
            нет, поэтому именно два узла, а не один с переменной иконкой. */}
        <WeaveSwitchIcon size={18} className="technique-menu__icon--wide" />
        <SlidersHorizontal size={18} className="technique-menu__icon--narrow" />
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

          {/* «Изделие»: правая панель (Decor/Grid) — то же меню, что и выбор
              техники, потому что и то, и другое отвечает на вопрос «что я плету
              и какой оно формы», в отличие от инструментов рисования. Видна
              только на ≤479.98px (Header.css), на широких экранах у панели есть
              своя кнопка в строке хедера. Пункт один — панель одна: вкладку
              внутри неё переключают уже в самой панели. */}
          {narrowExtra && (
            <div className="technique-menu__narrow-extra">
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={sidebarOpen}
                className={`technique-menu__item ${sidebarOpen ? 'technique-menu__item--active' : ''}`}
                title={technique === 'silyanka' ? 'Decor and grid settings' : 'Grid settings'}
                onClick={() => {
                  onToggleSidebar();
                  setOpen(false);
                }}
              >
                <SettingsPanelIcon size={16} />
                <span>{technique === 'silyanka' ? 'decor & grid' : 'grid settings'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
