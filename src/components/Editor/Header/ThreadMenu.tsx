import { X, Check } from 'lucide-react';
import { ThreadIcon } from './icons';
import { ThreadStyleFields } from './ThreadStyleFields';
import { THREAD_STRAND_DEFAULT_COLORS } from '../../../config/theme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';

// Кнопка «Нитка» у крестика — не простой тоггл, а мини-попап с выбором одной
// из двух нитей (крестик физически плетётся двумя нитками одновременно,
// см. spec.md, «Нитка»): клик по пункту сразу и выбирает нить, и включает
// инструмент.
export const ThreadMenu = ({
  activeTool, setActiveTool, activeThreadStrand, onSelectThreadStrand, threads, onClearAllThreads,
  activeThreadColor, activeThreadOpacity, onThreadColorChange, onThreadOpacityChange,
}: {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  activeThreadStrand: 1 | 2;
  onSelectThreadStrand: (strand: 1 | 2) => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();

  const selectStrand = (strand: 1 | 2) => {
    onSelectThreadStrand(strand);
    setActiveTool('thread');
    setOpen(false);
  };

  return (
    <div className="mirror-menu" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`tool-btn ${activeTool === 'thread' ? 'tool-btn--active' : ''}`}
        title="Thread (1/2)"
        aria-haspopup="menu"
        aria-expanded={open}
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

      {open && (
        <div className="mirror-menu__panel" role="menu">
          {([1, 2] as const).map((strand) => (
            <button
              key={strand}
              onClick={() => selectStrand(strand)}
              className={`mirror-menu__item ${activeTool === 'thread' && activeThreadStrand === strand ? 'mirror-menu__item--active' : ''}`}
              role="menuitemradio"
              aria-checked={activeTool === 'thread' && activeThreadStrand === strand}
              title={`Thread ${strand} (${strand})`}
            >
              <span
                className="mirror-menu__item-icon"
                style={{
                  width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                  background: THREAD_STRAND_DEFAULT_COLORS[strand],
                }}
              />
              <span className="mirror-menu__item-label">Thread {strand}</span>
              {activeTool === 'thread' && activeThreadStrand === strand && (
                <Check size={12} className="mirror-menu__item-check" />
              )}
            </button>
          ))}
          <div className="mirror-menu__divider" />
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
