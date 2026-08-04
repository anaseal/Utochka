import {
  PaintBucket, Stamp, Pencil, ArrowUpToLine, ArrowDownToLine, X,
} from 'lucide-react';
import { EraserIcon } from './icons';
import { MirrorMenu } from './MirrorMenu';
import { ThreadMenu } from './ThreadMenu';
import { ThreadStyleButton } from './ThreadStyleButton';
import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';
import { SilyankaHeaderProps, CrossWeaveHeaderProps, PeyoteHeaderProps } from './Header.types';

interface HeaderToolGroupProps {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  silyankaProps?: SilyankaHeaderProps;
  crossWeaveProps?: CrossWeaveHeaderProps;
  peyoteProps?: PeyoteHeaderProps;
}

// Тулбар рисования: карандаш/ластик — общие; нитка/заливка/mirror — общие по
// смыслу, но с технико-зависимыми деталями (ThreadMenu vs ThreadStyleButton,
// штамп есть у силянки и Peyote, нитки у Peyote нет вовсе). Скрыт целиком в
// режиме плетения (см. Header.tsx).
export const HeaderToolGroup = ({
  activeTool, setActiveTool, threads, onClearAllThreads, silyankaProps, crossWeaveProps, peyoteProps,
}: HeaderToolGroupProps) => {
  return (
    <div className="tool-group">
      <button
        onClick={() => setActiveTool('pencil')}
        className={`tool-btn ${activeTool === 'pencil' ? 'tool-btn--active' : ''}`}
        title="Pencil (B)"
        aria-pressed={activeTool === 'pencil'}
      >
        <Pencil size={14} />
      </button>

      <button
        onClick={() => setActiveTool(activeTool === 'eraser' ? 'pencil' : 'eraser')}
        className={`tool-btn ${activeTool === 'eraser' ? 'tool-btn--active' : ''}`}
        title="Eraser (E)"
      >
        <EraserIcon size={14} />
      </button>

      {silyankaProps && (
        <ThreadStyleButton
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          threads={threads}
          onClearAllThreads={onClearAllThreads}
          activeThreadColor={silyankaProps.activeThreadColor}
          activeThreadOpacity={silyankaProps.activeThreadOpacity}
          onThreadColorChange={silyankaProps.onThreadColorChange}
          onThreadOpacityChange={silyankaProps.onThreadOpacityChange}
        />
      )}

      {crossWeaveProps && (
        <ThreadMenu
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeThreadStrand={crossWeaveProps.activeThreadStrand}
          onSelectThreadStrand={crossWeaveProps.onSelectThreadStrand}
          threads={threads}
          onClearAllThreads={onClearAllThreads}
          activeThreadColor={crossWeaveProps.activeThreadColor}
          activeThreadOpacity={crossWeaveProps.activeThreadOpacity}
          onThreadColorChange={crossWeaveProps.onThreadColorChange}
          onThreadOpacityChange={crossWeaveProps.onThreadOpacityChange}
        />
      )}

      {crossWeaveProps && (
        <>
          <button
            onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
            className={`tool-btn ${activeTool === 'flood-fill' ? 'tool-btn--active' : ''}`}
            title="Flood Fill (G)"
            aria-pressed={activeTool === 'flood-fill'}
          >
            <PaintBucket size={14} />
          </button>

          <MirrorMenu
            mirrorMode={crossWeaveProps.mirrorMode}
            setMirrorMode={crossWeaveProps.setMirrorMode}
            onMakeSymmetric={crossWeaveProps.onMakeSymmetric}
            canMakeSymmetric={crossWeaveProps.canMakeSymmetric}
          />
        </>
      )}

      {silyankaProps && (
        <>
          <button
            onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
            className={`tool-btn ${activeTool === 'flood-fill' ? 'tool-btn--active' : ''}`}
            title="Flood Fill (G)"
            aria-pressed={activeTool === 'flood-fill'}
          >
            <PaintBucket size={14} />
          </button>

          <div className="tool-btn-group">
            <button
              onClick={() => setActiveTool(activeTool === 'stamp' ? 'pencil' : 'stamp')}
              className={`tool-btn ${activeTool === 'stamp' ? 'tool-btn--active' : ''}`}
              title="Stamp (S)"
              aria-pressed={activeTool === 'stamp'}
            >
              <Stamp size={14} />
            </button>

            {activeTool === 'stamp' && silyankaProps.hasStampPattern && (
              <>
                <button
                  onClick={silyankaProps.onToggleStampAnchorEdge}
                  className="tool-btn-group__badge"
                  title={silyankaProps.stampAnchorEdge === 'top'
                    ? 'Stamp anchor point: top (click or Shift to switch to bottom, Esc/Alt to reset stamp)'
                    : 'Stamp anchor point: bottom (click or Shift to switch to top, Esc/Alt to reset stamp)'}
                  aria-pressed={silyankaProps.stampAnchorEdge === 'bottom'}
                >
                  {silyankaProps.stampAnchorEdge === 'top'
                    ? <ArrowUpToLine size={9} />
                    : <ArrowDownToLine size={9} />}
                </button>

                {/* Тач-эквивалент Escape/Alt — на тач-экране нет клавиатуры,
                    так что сброс захваченного узора нужен и кнопкой. */}
                <button
                  onClick={silyankaProps.onCancelStampPattern}
                  className="tool-btn-group__badge tool-btn-group__badge--cancel"
                  title="Reset stamp pattern (Esc/Alt)"
                >
                  <X size={9} />
                </button>
              </>
            )}
          </div>

          <MirrorMenu
            mirrorMode={silyankaProps.mirrorMode}
            setMirrorMode={silyankaProps.setMirrorMode}
            onMakeSymmetric={silyankaProps.onMakeSymmetric}
            canMakeSymmetric={silyankaProps.canMakeSymmetric}
          />
        </>
      )}

      {peyoteProps && (
        <>
          <button
            onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
            className={`tool-btn ${activeTool === 'flood-fill' ? 'tool-btn--active' : ''}`}
            title="Flood Fill (G)"
            aria-pressed={activeTool === 'flood-fill'}
          >
            <PaintBucket size={14} />
          </button>

          {/* Штамп есть у Peyote (в отличие от crossWeave), но без бейджа
              anchor-edge — Peyote не различает «низ»/«верх» узора, якорь
              штампа всегда левый верхний угол выделения (см. peyoteStamp.ts).
              Только X-бейдж сброса, как у силянки. */}
          <div className="tool-btn-group">
            <button
              onClick={() => setActiveTool(activeTool === 'stamp' ? 'pencil' : 'stamp')}
              className={`tool-btn ${activeTool === 'stamp' ? 'tool-btn--active' : ''}`}
              title="Stamp (S)"
              aria-pressed={activeTool === 'stamp'}
            >
              <Stamp size={14} />
            </button>

            {activeTool === 'stamp' && peyoteProps.hasStampPattern && (
              <button
                onClick={peyoteProps.onCancelStampPattern}
                className="tool-btn-group__badge tool-btn-group__badge--cancel"
                title="Reset stamp pattern (Esc/Alt)"
              >
                <X size={9} />
              </button>
            )}
          </div>

          <MirrorMenu
            mirrorMode={peyoteProps.mirrorMode}
            setMirrorMode={peyoteProps.setMirrorMode}
            onMakeSymmetric={peyoteProps.onMakeSymmetric}
            canMakeSymmetric={peyoteProps.canMakeSymmetric}
          />
        </>
      )}
    </div>
  );
};
