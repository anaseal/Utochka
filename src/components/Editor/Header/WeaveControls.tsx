import {
  Undo2, RotateCcw, Crosshair, MousePointerClick, Eraser, Diamond, Maximize2, Minimize2,
} from 'lucide-react';
import './WeaveControls.css';
import { WeaveHelp } from './WeaveHelp';
import { IconButton } from '../../common/IconButton';
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
// инструментов рисования — те же кнопки, что и у остального хедера: круглые
// <IconButton variant="chip"> с раскладочным классом tool-btn и квадратные
// <IconButton variant="ghost"> с классом grid-controls__btn внутри «таблетки»
// (см. common/Stepper.css), никакого собственного оформления поверх холста.
// Размеры иконок тоже общие с хедером: 14 и там, и там (как Pencil/Eraser/
// Stamp и как Save/Load/Share) — своих размеров режим не заводит.
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
        <IconButton
          variant="chip"
          className="tool-btn"
          active={tool === 'segment'}
          onClick={() => onToolChange('segment')}
          title="Segment: node with its two edges, whole span, chain link or decor column"
          aria-pressed={tool === 'segment'}
          icon={<Diamond size={14} />}
        />
        <IconButton
          variant="chip"
          className="tool-btn"
          active={tool === 'bead'}
          onClick={() => onToolChange('bead')}
          title="Single bead"
          aria-pressed={tool === 'bead'}
          icon={<MousePointerClick size={14} />}
        />
        <IconButton
          variant="chip"
          className="tool-btn"
          active={tool === 'erase'}
          onClick={() => onToolChange('erase')}
          title="Erase marks"
          aria-pressed={tool === 'erase'}
          icon={<Eraser size={14} />}
        />
      </div>

      <div className="header__divider" />

      {/* Прогресс — как блок Zoom: подпись сверху, значение под ней; на
          ≤599.98px подпись убирается и блок ужимается в одну строку в две
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
              (display: contents), на ≤1149.98px становятся физическими рядами.
              Поворот/отражение полотна лежат в CanvasViewMenu (Header.tsx),
              а не здесь: контрол общий для рисования и режима плетения,
              второй копии у него нет. */}
          <div className="grid-controls__actions-row">
            <IconButton
              className="grid-controls__btn"
              size="md"
              shape="square"
              variant="ghost"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo last mark"
              icon={<Undo2 size={14} />}
            />
            <IconButton
              className="grid-controls__btn"
              size="md"
              shape="square"
              variant="ghost"
              onClick={onLocate}
              disabled={!canLocate}
              title="Show where I stopped"
              icon={<Crosshair size={14} />}
            />
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
            <IconButton
              className="grid-controls__btn header__weave-desktop-only"
              size="md"
              shape="square"
              variant="ghost"
              active={isFullscreen}
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-pressed={isFullscreen}
              icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            />
            {/* Модификатор --danger, а не variant="danger": вариант красит
                иконку красным всегда, а здесь разрушающее действие одно из
                шести в ряду и в покое не должно тянуть взгляд — красный только
                под курсором (см. Header.css).
                header__weave-desktop-only: на ≤767.98px строка контролов не
                помещается даже после разбивки на 2 ряда (см. Header.css) — Reset
                прячется отсюда, дубль живёт в overflow-меню "⋯" (Header.tsx),
                том же, где уже дублируются Zoom/Save/Load/Share. */}
            <IconButton
              className="grid-controls__btn grid-controls__btn--danger header__weave-desktop-only"
              size="md"
              shape="square"
              variant="ghost"
              onClick={onReset}
              disabled={markedCount === 0}
              title="Reset all progress"
              icon={<RotateCcw size={14} />}
            />
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
