import { useState } from 'react';
import type { ComponentType } from 'react';
import './TechniqueMenu.css';
import { IconButton } from '../../common/IconButton';
import { Menu } from '../../common/Menu';
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
// подписью на самой кнопке. По клику — список из четырёх пунктов на общем
// <Menu> (components/common/Menu.tsx), как и остальные меню хедера.
//
// Иконка триггера — фиксированный WeaveSwitchIcon (icons.tsx), а НЕ current.Icon:
// иконка текущей техники (Silyanka/Peyote/Loom...) менялась бы при каждом
// переключении, и кнопка-триггер визуально прыгала бы вместо того, чтобы быть
// узнаваемым постоянным символом действия «сменить технику» — тем же приёмом,
// что и FlipHorizontal у MirrorMenu (фиксированная иконка действия, не
// текущего состояния).
export const TechniqueMenu = ({ technique, onTechniqueChange }: TechniqueMenuProps) => {
  const [open, setOpen] = useState(false);
  const current = TECHNIQUES.find(t => t.id === technique) ?? TECHNIQUES[0];

  return (
    <Menu
      // Панель шире остальных (168px против 132px) — названия техник с
      // иконкой 20px в общую ширину не влезают. Задаётся переменной
      // --menu-min-width в TechniqueMenu.css, а не свойством мимо компонента.
      // align="start": меню стоит слева в ряду, центрированная панель уезжала
      // бы за левый край хедера.
      className="menu--technique"
      align="start"
      open={open}
      onClose={() => setOpen(false)}
      trigger={
        <IconButton
          variant="chip"
          className="tool-btn"
          active={open}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          title={`${current.label}: ${current.title}`}
          icon={<WeaveSwitchIcon size={14} />}
        />
      }
      items={TECHNIQUES.map(({ id, label, title, Icon }) => ({
        icon: <Icon size={20} />,
        label,
        // «Один из списка» — умолчание роли (menuitemradio при заданном
        // active) здесь и нужно, задавать явно не за чем.
        active: technique === id,
        title,
        // Техника выбирается один раз — меню закрывается, в отличие от
        // тумблеров зеркала и вида полотна.
        onClick: () => { onTechniqueChange(id); setOpen(false); },
      }))}
    />
  );
};
