import type { InputHTMLAttributes, Ref } from 'react';
import './TextField.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  // Отдаём готовую строку, а не событие — как <Switch> отдаёт новый флаг.
  // Оба редактируемых места вызова (имя проекта в галерее, значение степпера)
  // из события достают ровно e.target.value.
  //
  // Необязателен ради readOnly-поля Share-ссылки в ConfirmDialog: там менять
  // нечего и обработчик был бы пустышкой ради типа. React не ругается на
  // value без onChange именно потому, что поле readOnly.
  onChange?: (value: string) => void;
  // Цифры: моношрифт, чтобы значение не «дёргалось» по ширине при наборе.
  mono?: boolean;
  // Подчёркивание вместо рамки — для поля, живущего внутри строки контрола
  // (степпер), где полноценная рамка была бы второй рамкой поверх таблетки.
  inline?: boolean;
  invalid?: boolean;
  // В React 19 ref — обычный проп, но в InputHTMLAttributes его нет (та же
  // причина, что у <IconButton>): степпер выделяет содержимое по ref.
  ref?: Ref<HTMLInputElement>;
}

// Однострочное поле ввода дизайн-системы. Подпись, ширину и раскладку строки
// задаёт место вызова — здесь только сама рамка, шрифт и состояния.
//
// readOnly, placeholder, maxLength, autoFocus и обработчики (onBlur, onKeyDown,
// onFocus) приходят из InputHTMLAttributes — своих пропов под них не заводим.
export function TextField({
  value,
  onChange,
  mono = false,
  inline = false,
  invalid = false,
  className,
  type = 'text',
  ...rest
}: TextFieldProps) {
  const classes = [
    'text-field',
    mono ? 'text-field--mono' : '',
    inline ? 'text-field--inline' : '',
    invalid ? 'text-field--invalid' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      {...rest}
      type={type}
      className={classes}
      value={value}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
