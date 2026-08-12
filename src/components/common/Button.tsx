import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './controlVariants.css';
import './Button.css';

// chip — безрамочная кнопка с подложкой, поверх чужого содержимого;
// ghost — безрамочная без подложки, на своей панели. Разбор — controlVariants.css.
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'chip';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  // Залипающее состояние (выбранный инструмент, включённый режим). Отдельно
  // от :active — тот живёт доли секунды под нажатым пальцем, а это состояние
  // держится, пока режим включён.
  active?: boolean;
  icon?: ReactNode;
}

// Текстовая кнопка-действие. Наследует ButtonHTMLAttributes целиком, а не
// перечисляет onClick/disabled поимённо: местам вызова нужны и title, и
// aria-label, и autoFocus (ConfirmDialog ставит фокус на кнопку подтверждения),
// и type для кнопок внутри форм.
export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  active = false,
  icon,
  children,
  className,
  // Кнопка внутри <form> по умолчанию сабмитит её — в проекте таких кнопок
  // нет ни одной, все объявляют type="button" руками.
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full-width' : '',
    active ? 'btn--active' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // Подпись обёрнута в собственный элемент, а не лежит текстом: на узких
  // экранах кнопка Export сжимается до одной иконки, и медиа-запросу нужно
  // за что-то зацепиться (.btn__label), не трогая саму кнопку.
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children !== undefined && <span className="btn__label">{children}</span>}
    </button>
  );
}
