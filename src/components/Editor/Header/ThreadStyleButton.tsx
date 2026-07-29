import { X } from 'lucide-react';
import { ThreadIcon } from './icons';
import { ThreadStyleFields } from './ThreadStyleFields';
import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';

// Кнопка «Нитка» у силянки (простой тоггл, в отличие от ThreadMenu у
// crossWeave — там уже попап на выбор нити) — добавляем второй маленький
// бейдж-триггер (цветной кружок, противоположный угол от «очистить все»),
// открывающий тот же ThreadStyleFields, что и у crossWeave.
export const ThreadStyleButton = ({
  activeTool, setActiveTool, threads, onClearAllThreads,
  activeThreadColor, activeThreadOpacity, onThreadColorChange, onThreadOpacityChange,
}: {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();

  return (
    <div className="tool-btn-group" ref={ref}>
      <button
        onClick={() => setActiveTool(activeTool === 'thread' ? 'pencil' : 'thread')}
        className={`tool-btn ${activeTool === 'thread' ? 'tool-btn--active' : ''}`}
        title="Thread (T)"
        aria-pressed={activeTool === 'thread'}
      >
        <ThreadIcon size={14} />
      </button>

      {activeTool === 'thread' && threads.length > 0 && (
        <button
          onClick={onClearAllThreads}
          className="tool-btn-group__badge tool-btn-group__badge--cancel"
          title="Clear all threads"
        >
          <X size={9} />
        </button>
      )}

      {activeTool === 'thread' && (
        <button
          ref={triggerRef}
          onClick={() => setOpen(o => !o)}
          className="tool-btn-group__badge tool-btn-group__badge--swatch"
          style={{ '--color-value': activeThreadColor } as React.CSSProperties}
          title="Thread color"
          aria-haspopup="menu"
          aria-expanded={open}
        />
      )}

      {open && (
        <div className="mirror-menu__panel" role="menu">
          <ThreadStyleFields
            color={activeThreadColor}
            opacity={activeThreadOpacity}
            onColorChange={onThreadColorChange}
            onOpacityChange={onThreadOpacityChange}
          />
        </div>
      )}
    </div>
  );
};
