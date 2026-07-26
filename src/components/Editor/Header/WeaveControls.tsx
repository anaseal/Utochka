import { Undo2, RotateCcw, Crosshair, FlipHorizontal, MousePointerClick, Eraser, Diamond } from 'lucide-react';
import { WeaveHelp } from './WeaveHelp';

export type WeaveTool = 'segment' | 'bead' | 'erase';
export type WeaveOrientation = 'vertical' | 'horizontal';

interface WeaveControlsProps {
  // Правило сегмента у техник разное — подсказка показывает своё для каждой.
  technique: 'silyanka' | 'crossWeave';
  tool: WeaveTool;
  onToolChange: (tool: WeaveTool) => void;
  markedCount: number;
  totalCount: number;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onLocate: () => void;
  canLocate: boolean;
  orientation: WeaveOrientation;
  onToggleOrientation: () => void;
  flipped: boolean;
  onToggleFlip: () => void;
}

// Контролы режима плетения. Живут в хедере на месте скрытых палитры и
// инструментов рисования — те же классы (tool-btn / grid-controls), что и у
// остального хедера, никакого собственного оформления поверх холста.
export const WeaveControls = ({
  technique,
  tool,
  onToolChange,
  markedCount,
  totalCount,
  canUndo,
  onUndo,
  onReset,
  onLocate,
  canLocate,
  orientation,
  onToggleOrientation,
  flipped,
  onToggleFlip,
}: WeaveControlsProps) => {
  const percent = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;

  return (
    <>
      <div className="tool-group">
        <button
          onClick={() => onToolChange('segment')}
          className={`tool-btn ${tool === 'segment' ? 'tool-btn--active' : ''}`}
          title="Segment: node with its two edges, whole span, chain link or decor column"
          aria-pressed={tool === 'segment'}
        >
          <Diamond size={14} />
        </button>
        <button
          onClick={() => onToolChange('bead')}
          className={`tool-btn ${tool === 'bead' ? 'tool-btn--active' : ''}`}
          title="Single bead"
          aria-pressed={tool === 'bead'}
        >
          <MousePointerClick size={14} />
        </button>
        <button
          onClick={() => onToolChange('erase')}
          className={`tool-btn ${tool === 'erase' ? 'tool-btn--active' : ''}`}
          title="Erase marks"
          aria-pressed={tool === 'erase'}
        >
          <Eraser size={14} />
        </button>
      </div>

      <div className="header__divider" />

      {/* Прогресс — как блок Zoom: подпись сверху, значение под ней. */}
      <div className="grid-controls grid-controls--vertical-zoom">
        <div className="grid-controls__group weave-progress">
          <span className="grid-controls__label">Woven</span>
          <span className="weave-progress__value">
            {markedCount} <span className="weave-progress__total">/ {totalCount}</span>
          </span>
          <span
            className="weave-progress__bar"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className="weave-progress__bar-fill" style={{ width: `${percent}%` }} />
          </span>
        </div>
      </div>

      <div className="header__divider" />

      <div className="grid-controls">
        <div className="grid-controls__toolbar">
          <div className="grid-controls__actions-row">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="grid-controls__btn"
              title="Undo last mark"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={onLocate}
              disabled={!canLocate}
              className="grid-controls__btn"
              title="Show where I stopped"
            >
              <Crosshair size={13} />
            </button>
            <button
              onClick={onToggleOrientation}
              className="grid-controls__btn"
              title={orientation === 'vertical' ? 'Lay the canvas horizontally' : 'Stand the canvas vertically'}
            >
              <span className="weave-orientation-glyph">{orientation === 'vertical' ? '↔' : '↕'}</span>
            </button>
            <button
              onClick={onToggleFlip}
              className={`grid-controls__btn ${flipped ? 'grid-controls__btn--on' : ''}`}
              title="Mirror the canvas"
              aria-pressed={flipped}
            >
              <FlipHorizontal size={13} />
            </button>
            <button
              onClick={onReset}
              disabled={markedCount === 0}
              className="grid-controls__btn grid-controls__btn--reset"
              title="Reset all progress"
            >
              <RotateCcw size={13} />
            </button>
            <WeaveHelp technique={technique} />
          </div>
        </div>
      </div>
    </>
  );
};
