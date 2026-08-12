import { X, Undo2 } from 'lucide-react';
import { IconButton } from '../../common/IconButton';
import { ThreadTrace } from '../../../types/thread';

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
        <IconButton
          className="thread-trace-controls__btn"
          size="md"
          shape="square"
          variant="secondary"
          onClick={onRemoveLastPoint}
          onPointerDown={(e) => e.stopPropagation()}
          title="Undo last point"
          aria-label="Undo last point"
          icon={<Undo2 size={14} />}
        />
      )}
      {/* danger, а не secondary с красным ховером: сброс нитки стирает всю
          недоведённую трассировку, и в проекте такие действия красные и в покое
          (см. controlVariants.css). */}
      <IconButton
        className="thread-trace-controls__btn"
        size="md"
        shape="square"
        variant="danger"
        onClick={onCancel}
        onPointerDown={(e) => e.stopPropagation()}
        title="Cancel thread"
        aria-label="Cancel thread"
        icon={<X size={14} />}
      />
    </div>
  );
};
