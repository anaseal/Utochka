import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
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

  const valueEl = editing ? (
    <input
      ref={inputRef}
      className="grid-controls__input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={confirm}
      onKeyDown={handleKeyDown}
      type="text"
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

  const actions = (
    <div className="grid-controls__actions">
      <button onClick={() => onDelta(-1)} className="grid-controls__btn" disabled={disabled}>−</button>
      {valueEl}
      <button onClick={() => onDelta(1)} className="grid-controls__btn" disabled={disabled}>+</button>
    </div>
  );

  const reset = onReset && (
    <button
      type="button"
      onClick={onReset}
      className="grid-controls__reset"
      disabled={disabled}
      title="Reset to default"
      aria-label="Reset to default"
    >
      <RotateCcw size={13} />
    </button>
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
