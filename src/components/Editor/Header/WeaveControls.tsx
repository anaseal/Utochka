import {
  Undo2, RotateCcw, Crosshair, FlipHorizontal, MousePointerClick, Eraser, Diamond,
  MoveHorizontal, MoveVertical,
} from 'lucide-react';
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
// Размеры иконок тоже общие с хедером: 14 в .tool-btn (как Pencil/Eraser/
// Stamp) и 14 в .grid-controls__btn (как Save/Load/Share) — своих размеров
// режим не заводит.
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
          <span className="grid-controls__label">Done</span>
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
              <Undo2 size={14} />
            </button>
            <button
              onClick={onLocate}
              disabled={!canLocate}
              className="grid-controls__btn"
              title="Show where I stopped"
            >
              <Crosshair size={14} />
            </button>
            {/* Стрелка поворота — иконка lucide, а не текстовые ↔/↕: у юникодных
                стрелок своя высота и толщина внутри кегля, рядом с соседними
                иконками они читались заметно мельче и тоньше. */}
            <button
              onClick={onToggleOrientation}
              className="grid-controls__btn"
              title={orientation === 'vertical' ? 'Lay the canvas horizontally' : 'Stand the canvas vertically'}
            >
              {orientation === 'vertical' ? <MoveHorizontal size={14} /> : <MoveVertical size={14} />}
            </button>
            <button
              onClick={onToggleFlip}
              className={`grid-controls__btn ${flipped ? 'grid-controls__btn--on' : ''}`}
              title="Mirror the canvas"
              aria-pressed={flipped}
            >
              <FlipHorizontal size={14} />
            </button>
            {/* --danger, а не --reset: последний рассчитан на текстовую кнопку
                CLEAR (width: auto + padding + border-left) и здесь делал
                иконочный Reset шире соседей и с лишней разделительной чертой. */}
            <button
              onClick={onReset}
              disabled={markedCount === 0}
              className="grid-controls__btn grid-controls__btn--danger"
              title="Reset all progress"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* «?» — вне таблетки с действиями: внутри неё он стоял сразу за Reset и
          читался как ещё одно действие над схемой, хотя ничего не делает с
          работой, а объясняет режим. Снаружи это круглый tool-btn — та же
          категория, что кнопки референса и настроек: вспомогательное, не
          инструмент и не действие. */}
      <WeaveHelp technique={technique} />
    </>
  );
};
