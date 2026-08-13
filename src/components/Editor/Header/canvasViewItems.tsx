import { FlipHorizontal, MoveHorizontal } from 'lucide-react';
import type { MenuItem } from '../../common/Menu';
import { SharedHeaderProps } from './Header.types';

// Два пункта «как полотно лежит перед тобой» — списком, а не разметкой:
// показывают их два разных места. На широких экранах — своё меню под кнопкой
// поворота (CanvasViewMenu, обычный <Menu>), на ≤1279.98px — меню «Функции»
// (HeaderOverflowMenu), где кнопки из строки хедера уже нет (место ушло под
// имя проекта, см. Header.css). Второе — не меню, а строки с подписями, и под
// <Menu> целиком не ложится: оно рисует эти пункты само, через
// <MenuItemButton>. Отдавая список, а не готовый узел, обе стороны получают
// одни и те же два пункта без копии логики.
//
// Оба — независимые тумблеры, а не «один из списка»: роль menuitemcheckbox
// задана явно, из умолчания (menuitemradio при заданном active) её не вывести.
// Меню после клика не закрывается — поворот и отражение щёлкают парой.
export const canvasViewItems = ({
  orientation, onToggleOrientation, flipped, onToggleFlip,
}: SharedHeaderProps['canvasView']): MenuItem[] => [
  {
    icon: <MoveHorizontal size={12} />,
    label: 'Lay horizontally',
    active: orientation === 'horizontal',
    role: 'menuitemcheckbox',
    onClick: onToggleOrientation,
  },
  {
    icon: <FlipHorizontal size={12} />,
    label: 'Flip',
    active: flipped,
    role: 'menuitemcheckbox',
    onClick: onToggleFlip,
  },
];
