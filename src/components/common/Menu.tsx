import { useRef } from 'react';
import type { ReactNode, Ref } from 'react';
import { Check } from 'lucide-react';
import { useDismissable } from '../../hooks/useDismissablePopup';
import './Menu.css';

export type MenuAlign = 'start' | 'center' | 'end';

export interface MenuItem {
  icon?: ReactNode;
  label: ReactNode;
  // Выбранный пункт: акцентный цвет, вес 700 и галочка справа. Три состояния,
  // а не два: undefined — у пункта выбранности нет вовсе (разовое действие,
  // роль menuitem), true/false — есть и сейчас включена или выключена.
  active?: boolean;
  disabled?: boolean;
  // Роль пункта для скринридера. Умолчание выводится из active (см. выше),
  // но «один из списка» (техника, нить) и «независимый тумблер» (Mirror Mode,
  // поворот полотна) различаются только здесь — из вида пункта их не вывести.
  role?: 'menuitem' | 'menuitemradio' | 'menuitemcheckbox';
  // Подсказка при наведении. Есть у половины пунктов хедера («Make symmetric»,
  // названия техник, номера нитей): подпись пункта там короче, чем требуется,
  // чтобы понять действие целиком.
  title?: string;
  onClick: () => void;
}

interface MenuProps {
  open: boolean;
  onClose: () => void;
  // Куда растёт панель от триггера. По умолчанию center — так стоят пять из
  // шести меню хедера, start нужен только переключателю техники.
  align?: MenuAlign;
  items: MenuItem[];
  trigger: ReactNode;
  // Класс-зацепка для места вызова: у меню хедера на нём висит адресация
  // брейкпоинтов (.canvas-view-menu прячется на ≤1279.98px, .menu--technique
  // задаёт свою ширину панели). Оформление сюда не пишем.
  className?: string;
  // Хвост панели под пунктами. Нужен ровно одному меню — «Нитка» у крестика
  // (ThreadMenu): после выбора нити там идут разделитель и поля цвета и
  // прозрачности. Пунктом это не выразить — в MenuItem строка «иконка +
  // подпись + галочка», а не два инпута.
  children?: ReactNode;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Один пункт списка. Экспортируется отдельно, потому что пункты вида полотна
// (canvasViewItems.tsx) показывает не только своё меню, но и панель «Функции»
// (HeaderOverflowMenu) — а она не список пунктов, а строки с подписями и
// группами кнопок, и целиком под <Menu> не ложится. Без этого экспорта её
// два пункта пришлось бы верстать копией.
export function MenuItemButton({ item }: { item: MenuItem }) {
  return (
    <button
      type="button"
      role={item.role ?? (item.active === undefined ? 'menuitem' : 'menuitemradio')}
      aria-checked={item.active}
      className={['menu__item', item.active ? 'menu__item--active' : ''].filter(Boolean).join(' ')}
      disabled={item.disabled}
      title={item.title}
      onClick={item.onClick}
    >
      {item.icon !== undefined && <span className="menu__item-icon">{item.icon}</span>}
      <span className="menu__item-label">{item.label}</span>
      {item.active && <Check size={12} className="menu__item-check" />}
    </button>
  );
}

interface MenuPanelProps {
  align?: MenuAlign;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

// Плашка меню без триггера и без логики закрытия. Экспортируется ради
// ThreadStyleButton: там попап открывает не первая кнопка блока, а бейдж-
// кружок третьим по счёту, и правило «триггер — первый фокусируемый узел»
// (см. focusTrigger ниже) вернуло бы фокус после Escape на кнопку
// инструмента. Этот случай остаётся на useDismissablePopup со своим
// triggerRef, а от меню берёт только внешний вид панели.
export function MenuPanel({ align = 'center', children, ref }: MenuPanelProps) {
  return (
    <div ref={ref} className={`menu__panel menu__panel--${align}`} role="menu">
      {children}
    </div>
  );
}

// Попап-меню дизайн-системы: триггер и плашка со списком пунктов под ним.
// Управляемый — флагом open владеет место вызова, а не компонент. Так пункт
// сам решает, закрываться ли после клика: выбор техники или нити закрывает
// меню, а тумблер (Mirror Mode, поворот полотна) остаётся открытым, чтобы
// щёлкнуть второй. Внутрь Menu это правило не зашито намеренно — иначе
// половине мест вызова пришлось бы его отключать пропом.
export function Menu({ open, onClose, align = 'center', items, trigger, className, children }: MenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Возврат фокуса на триггер по Escape. Триггер приходит готовым узлом, ref
  // к нему снаружи не привязать — берём первый фокусируемый элемент корня:
  // в разметке он идёт до панели, значит в порядке документа это и есть он.
  // Проверка на панель — на случай триггера вообще без фокусируемого узла.
  const focusTrigger = () => {
    const first = rootRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    if (first && !panelRef.current?.contains(first)) first.focus();
  };

  // Триггер лежит внутри корня намеренно: клик по нему не должен считаться
  // «кликом снаружи», иначе меню закрылось бы подписью на document и тут же
  // открылось обработчиком самой кнопки.
  useDismissable(open, rootRef, (reason) => {
    onClose();
    if (reason === 'escape') focusTrigger();
  });

  return (
    <div className={['menu', className ?? ''].filter(Boolean).join(' ')} ref={rootRef}>
      {trigger}

      {open && (
        <MenuPanel align={align} ref={panelRef}>
          {items.map((item, index) => (
            // Пункты меню — статичные списки в 2–5 строк, задаваемые прямо
            // на месте вызова: своего id у них нет и заводить его не за чем.
            <MenuItemButton key={index} item={item} />
          ))}
          {children}
        </MenuPanel>
      )}
    </div>
  );
}
