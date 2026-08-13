import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { IconButton } from '../../common/IconButton';
import { Menu } from '../../common/Menu';
import { canvasViewItems } from './canvasViewItems';
import { SharedHeaderProps } from './Header.types';

// Вид полотна (поворот на 90° и зеркальное отражение) — не инструмент
// рисования и не часть режима плетения, а общая настройка «как полотно
// лежит перед тобой» (см. spec.md, «Поворот и отражение полотна»): доступна
// всегда, в любой технике и в любом режиме, но живёт в одном месте, а не
// дублируется. Единая кнопка раскрывает мини-попап с двумя независимыми
// тумблерами — та же визуальная схема, что и у Mirror Mode (MirrorMenu).
// Класс canvas-view-menu поверх общего .menu — зацепка для ≤1279.98px, где эта
// кнопка убрана из строки (место отдано имени проекта), а её пункты
// (canvasViewItems) показывает меню «Функции»; по одному .menu отличить её от
// кнопки зеркала было бы нельзя.
export const CanvasViewMenu = (canvasView: SharedHeaderProps['canvasView']) => {
  const [open, setOpen] = useState(false);
  const active = canvasView.orientation === 'horizontal' || canvasView.flipped;

  return (
    <Menu
      className="canvas-view-menu"
      open={open}
      onClose={() => setOpen(false)}
      trigger={
        <IconButton
          variant="chip"
          className="tool-btn"
          active={active}
          onClick={() => setOpen(o => !o)}
          title="Canvas view: rotate or mirror"
          aria-haspopup="menu"
          aria-expanded={open}
          icon={<RotateCw size={14} />}
        />
      }
      items={canvasViewItems(canvasView)}
    />
  );
};
