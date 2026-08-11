import {
  Undo2, RotateCcw, Crosshair, MousePointerClick, Eraser, Diamond, Maximize2, Minimize2,
} from 'lucide-react';
import { WeaveHelp } from './WeaveHelp';
import { Technique } from './Header.types';

export type WeaveTool = 'segment' | 'bead' | 'erase';

interface WeaveControlsProps {
  // Правило сегмента у техник разное — подсказка показывает своё для каждой
  // (см. WeaveHelp.tsx). Header.tsx передаёт сюда technique целиком.
  technique: Technique;
  tool: WeaveTool;
  onToolChange: (tool: WeaveTool) => void;
  markedCount: number;
  totalCount: number;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onLocate: () => void;
  canLocate: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
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
  isFullscreen,
  onToggleFullscreen,
}: WeaveControlsProps) => {
  const percent = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;

  return (
    <>
      <div className="tool-group tool-group--weave">
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

      {/* Прогресс — как блок Zoom: подпись сверху, значение под ней; на
          ≤479.98px подпись убирается и блок ужимается в одну строку в две
          колонки сетки хедера (Header.css). */}
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
          {/* Undo/Locate — 2 строки по тому же приёму, что уже даёт
              компактность Undo/Redo/Clear/Save/Load/Share в Header.tsx
              (см. .grid-controls__actions-row/-divider в Header.css): на
              десктопе/планшете обе строки "растворяются" в один ряд
              (display: contents), на ≤1024px становятся физическими рядами.
              Поворот/отражение полотна отсюда уехали в CanvasViewMenu
              (Header.tsx) — контрол общий для рисования и режима плетения,
              копии здесь больше нет. */}
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
          </div>
          <span className="grid-controls__toolbar-divider" aria-hidden="true" />
          <div className="grid-controls__actions-row">
            {/* Полноэкранный режим браузера — максимум места на экране при
                работе с изделием в руках (телефон/планшет). Независимый
                тумблер, не завязан на вход/выход из режима плетения самого
                по себе, но выключается вместе с ним (см. App.tsx,
                toggleWeaveMode). header__weave-desktop-only — тот же приём,
                что у Reset ниже: на ≤767.98px строка не помещается, дубль
                живёт в overflow-меню "⋯" (Header.tsx). */}
            <button
              onClick={onToggleFullscreen}
              className={`grid-controls__btn header__weave-desktop-only ${isFullscreen ? 'grid-controls__btn--on' : ''}`}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-pressed={isFullscreen}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            {/* --danger, а не --reset: последний рассчитан на текстовую кнопку
                CLEAR (width: auto + padding + border-left) и здесь делал
                иконочный Reset шире соседей и с лишней разделительной чертой.
                header__weave-desktop-only: на ≤767.98px строка контролов не
                помещается даже после разбивки на 2 ряда (см. Header.css) — Reset
                прячется отсюда, дубль живёт в overflow-меню "⋯" (Header.tsx),
                том же, где уже дублируются Zoom/Save/Load/Share. */}
            <button
              onClick={onReset}
              disabled={markedCount === 0}
              className="grid-controls__btn grid-controls__btn--danger header__weave-desktop-only"
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
          инструмент и не действие. Прячется на ≤767.98px по той же причине,
          что и Reset выше — дубль в overflow-меню. */}
      <WeaveHelp technique={technique} className="header__weave-desktop-only" />
    </>
  );
};
