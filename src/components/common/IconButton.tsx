import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import type { ButtonVariant } from './Button';
import './controlVariants.css';
import './IconButton.css';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonShape = 'circle' | 'square';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  size?: IconButtonSize;
  shape?: IconButtonShape;
  variant?: ButtonVariant;
  // Залипающее состояние — см. тот же проп у <Button>.
  active?: boolean;
  icon: ReactNode;
  // В React 19 ref — обычный проп функционального компонента, но в
  // ButtonHTMLAttributes его нет, и без объявления TS его не пропустит.
  // Нужен всем триггерам попапов хедера: useDismissablePopup возвращает
  // фокус на кнопку по Escape.
  ref?: Ref<HTMLButtonElement>;
}

// Квадратная или круглая кнопка без подписи. Отдельный компонент, а не
// <Button> без children: у неё фиксированный размер вместо паддингов и своя
// шкала (22 / 26 / 36), снятая с .tool-btn в хедере.
export function IconButton({
  size = 'md',
  shape = 'circle',
  variant = 'secondary',
  active = false,
  icon,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = [
    'icon-btn',
    `icon-btn--${variant}`,
    `icon-btn--${size}`,
    `icon-btn--${shape}`,
    active ? 'icon-btn--active' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon}
    </button>
  );
}
