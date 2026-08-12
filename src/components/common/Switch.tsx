import type { ButtonHTMLAttributes } from 'react';
import './Switch.css';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children' | 'type'> {
  checked: boolean;
  // Отдаём новое значение, а не событие: местам вызова нужен именно флаг
  // (toggleAutosave(id, next), setTopEdgeEnabled(next)), и вытаскивать его
  // из aria-checked обратно они бы всё равно не стали.
  onChange: (checked: boolean) => void;
}

// Тумблер дизайн-системы: два состояния, без подписи. Подпись и раскладку
// строки даёт место вызова — у галереи это «Auto» слева, у сайдбара строка
// секции с лейблом и подсказкой; общего у них только сам переключатель.
//
// Это <button role="switch">, а не <input type="checkbox">: обе существующие
// реализации проекта написаны кнопкой, форм в проекте нет вообще, а кнопке
// не нужен ни скрытый инпут под оформлением, ни id для <label>. Состояние
// живёт в aria-checked — и для скринридера, и для CSS (см. Switch.css).
export function Switch({ checked, onChange, className, disabled, ...rest }: SwitchProps) {
  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={['switch', className ?? ''].filter(Boolean).join(' ')}
      onClick={() => onChange(!checked)}
    />
  );
}
