import { useState } from 'react';
import { FlipHorizontal } from 'lucide-react';
import { MakeSymmetricIcon } from './icons';
import { IconButton } from '../../common/IconButton';
import { Menu } from '../../common/Menu';

// Единая кнопка Mirror Mode раскрывает мини-попап с двумя связанными
// зеркальными операциями — переключателем режима и одноразовым действием
// "Сделать симметричным" — вместо отдельной иконки для второго действия.
// Закрытие после клика — только у второго: режим щёлкают и оставляют меню
// открытым, чтобы сразу же нажать «Сделать симметричным» (см. Menu.tsx,
// флагом open владеет место вызова).
export const MirrorMenu = ({
  mirrorMode, setMirrorMode, onMakeSymmetric, canMakeSymmetric,
}: {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Menu
      open={open}
      onClose={() => setOpen(false)}
      trigger={
        <IconButton
          variant="chip"
          className="tool-btn"
          active={mirrorMode}
          onClick={() => setOpen(o => !o)}
          title="Mirror Mode (M)"
          aria-haspopup="menu"
          aria-expanded={open}
          icon={<FlipHorizontal size={14} />}
        />
      }
      items={[
        {
          icon: <FlipHorizontal size={12} />,
          label: 'Mirror Mode',
          active: mirrorMode,
          // Независимый тумблер, а не «один из списка» — из вида пункта это
          // не следует, роль задаём явно.
          role: 'menuitemcheckbox',
          onClick: () => setMirrorMode(!mirrorMode),
        },
        {
          icon: <MakeSymmetricIcon size={12} />,
          label: 'Make symmetric',
          disabled: !canMakeSymmetric,
          title: 'Fills the missing mirrored half of the current design',
          onClick: () => { onMakeSymmetric(); setOpen(false); },
        },
      ]}
    />
  );
};
