import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { IconButton } from './IconButton';
import { TextField } from './TextField';
import './Stepper.css';

export type StepperVariant = 'bar' | 'overflow';

export const Stepper = ({
  label,
  value,
  onDelta,
  onReset,
  variant = 'bar',
  onSet,
  inputValue,
  min,
  max,
  disabled = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  onDelta: (sign: -1 | 1) => void;
  onReset?: () => void;
  variant?: StepperVariant;
  onSet?: (value: number) => void;
  inputValue?: number;
  min?: number;
  max?: number;
  // Параметр, который в текущем состоянии ни на что не влияет (например
  // Taper Depth, пока обе стороны выключены) — крутится, но ничего не меняет.
  // Гасим целиком, а не прячем: место в панели остаётся, и видно, что настройка
  // есть, просто сейчас не работает.
  disabled?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = onSet !== undefined && inputValue !== undefined && !disabled;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    if (!editable) return;
    setDraft(String(inputValue));
    setEditing(true);
  };

  const confirm = () => {
    if (!onSet) return;
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      let val = Math.round(parsed);
      if (min !== undefined) val = Math.max(min, val);
      if (max !== undefined) val = Math.min(max, val);
      onSet(val);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') setEditing(false);
  };

  const wrapperClass = variant === 'overflow' ? 'header__overflow-row' : 'grid-controls__group';
  const labelClass = variant === 'overflow' ? 'header__overflow-label' : 'grid-controls__label';

  // Класс остаётся только ради ширины, выключки по центру и акцентного цвета
  // цифр — рамка-подчёркивание, моношрифт и размер приходят из
  // <TextField mono inline>. Поле живёт только пока идёт правка (blur его
  // же и закрывает), то есть всегда в фокусе — подчёркивание всегда акцентное.
  const valueEl = editing ? (
    <TextField
      ref={inputRef}
      className="grid-controls__input"
      mono
      inline
      value={draft}
      onChange={setDraft}
      onBlur={confirm}
      onKeyDown={handleKeyDown}
      inputMode="numeric"
    />
  ) : (
    <span
      className={`grid-controls__value${editable ? ' grid-controls__value--editable' : ''}`}
      onClick={editable ? startEdit : undefined}
      title={editable ? 'Click to edit' : undefined}
    >
      {value}
    </span>
  );

  // Имя кнопки собирается из подписи степпера: сам по себе глиф «−» читается
  // вслух как «минус» без всякого намёка на то, что именно он меняет. Только
  // aria-label, без title: по −/+ кликают подряд, и всплывающая подсказка
  // вставала бы под курсор между нажатиями. Подпись бывает и узлом (не
  // строкой) — тогда имени нет, выдумать его не из чего.
  const labelText = typeof label === 'string' ? label : undefined;

  // Глиф передаётся как icon, а не как children: <IconButton> children не
  // рендерит вовсе, и «−»/«+» здесь ровно та же роль, что svg у соседних
  // кнопок таблетки — единственный знак внутри квадрата. Ступень md выбрана
  // ради размера глифа (14px, --text-xl), совпадающего с size={14} у lucide
  // в тулбарах хедера; сам бокс — 24px из .grid-controls__btn (Stepper.css).
  const actions = (
    <div className="grid-controls__actions">
      <IconButton
        className="grid-controls__btn"
        size="md"
        shape="square"
        variant="ghost"
        onClick={() => onDelta(-1)}
        disabled={disabled}
        aria-label={labelText && `Decrease ${labelText}`}
        icon="−"
      />
      {valueEl}
      <IconButton
        className="grid-controls__btn"
        size="md"
        shape="square"
        variant="ghost"
        onClick={() => onDelta(1)}
        disabled={disabled}
        aria-label={labelText && `Increase ${labelText}`}
        icon="+"
      />
    </div>
  );

  // Класс остаётся только ради места: колонку в сетке строки задаёт
  // GridSidebar.css (`grid-area: 1 / 3` и ужатие до 18px на узкой панели),
  // оформление — целиком в <IconButton variant="ghost">.
  const reset = onReset && (
    <IconButton
      className="grid-controls__reset"
      size="sm"
      shape="square"
      variant="ghost"
      onClick={onReset}
      disabled={disabled}
      title={labelText ? `Reset ${labelText} to default` : 'Reset to default'}
      aria-label={labelText ? `Reset ${labelText} to default` : 'Reset to default'}
      icon={<RotateCcw size={13} />}
    />
  );

  return (
    <div className={`${wrapperClass}${disabled ? ' grid-controls--disabled' : ''}`}>
      <span className={labelClass}>{label}</span>
      {variant === 'overflow' ? (
        <>{reset}{actions}</>
      ) : (
        <>{actions}{reset}</>
      )}
    </div>
  );
};
