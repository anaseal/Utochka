import { X, Undo2 } from 'lucide-react';
import { ThreadTrace } from '../ThreadLayer/ThreadLayer';

interface ThreadTraceControlsProps {
  trace: ThreadTrace | null;
  onRemoveLastPoint: () => void;
  onCancel: () => void;
}

// Тач-эквивалент крестика-по-hover (ThreadLayer, недостижим без hover на
// тач-экранах) и клавиши Escape (нет физической клавиши на тач) — плавающая
// пара кнопок, видна только пока трассировка нитки не завершена. Byte-в-byte
// общий для CanvasView/CrossWeaveCanvasView, как CanvasChrome.
export const ThreadTraceControls = ({ trace, onRemoveLastPoint, onCancel }: ThreadTraceControlsProps) => {
  if (!trace) return null;

  return (
    <div className="thread-trace-controls">
      {trace.beadIds.length >= 2 && (
        <button
          type="button"
          className="thread-trace-controls__btn"
          onClick={onRemoveLastPoint}
          onPointerDown={(e) => e.stopPropagation()}
          title="Undo last point"
          aria-label="Undo last point"
        >
          <Undo2 size={14} />
        </button>
      )}
      <button
        type="button"
        className="thread-trace-controls__btn thread-trace-controls__btn--cancel"
        onClick={onCancel}
        onPointerDown={(e) => e.stopPropagation()}
        title="Cancel thread"
        aria-label="Cancel thread"
      >
        <X size={14} />
      </button>
    </div>
  );
};
