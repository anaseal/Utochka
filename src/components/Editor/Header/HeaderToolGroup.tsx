import {
  PaintBucket, Stamp, Pencil, ArrowUpToLine, ArrowDownToLine, X, Wrench,
} from 'lucide-react';
import './HeaderToolGroup.css';
import { EraserIcon, ThreadIcon } from './icons';
import { IconButton } from '../../common/IconButton';
import { MirrorMenu } from './MirrorMenu';
import { ThreadMenu } from './ThreadMenu';
import { ThreadStyleButton } from './ThreadStyleButton';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';
import { SilyankaHeaderProps, CrossWeaveHeaderProps, PeyoteHeaderProps, LoomHeaderProps } from './Header.types';

interface HeaderToolGroupProps {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  silyankaProps?: SilyankaHeaderProps;
  crossWeaveProps?: CrossWeaveHeaderProps;
  peyoteProps?: PeyoteHeaderProps;
  loomProps?: LoomHeaderProps;
}

// Тулбар рисования: карандаш/ластик — общие; нитка/заливка/mirror — общие по
// смыслу, но с технико-зависимыми деталями (ThreadMenu vs ThreadStyleButton,
// штамп есть у силянки/Peyote/Loom, нитки у Peyote/Loom нет вовсе). Скрыт
// целиком в режиме плетения (см. Header.tsx).
export const HeaderToolGroup = ({
  activeTool, setActiveTool, threads, onClearAllThreads, silyankaProps, crossWeaveProps, peyoteProps, loomProps,
}: HeaderToolGroupProps) => {
  // Peyote и Loom делят один и тот же блок заливка/штамп/mirror (LoomHeaderProps
  // = PeyoteHeaderProps, см. Header.types.ts) — тот же приём, что GridSidebar
  // использует для crossWeave/Peyote (basicProps = crossWeaveProps ?? peyoteProps).
  const stampMirrorProps = peyoteProps ?? loomProps;

  // Меню «Инструменты» (.tool-extras): на ≤599.98px всё, что после карандаша
  // и ластика, уезжает под одну кнопку — иначе строка хедера не укладывается
  // в два ровных ряда (см. Header.css). На более широких экранах и обёртка, и
  // панель «растворяются» (display: contents), и ветки ниже стоят в строке как
  // раньше — тем же приёмом, каким PaletteWidget прячет палитру под иконку.
  // Панель поэтому рендерится всегда, а показывает/прячет её CSS: сними
  // условие — и на десктопе инструменты пропали бы вовсе.
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();
  // Иконка триггера — активный спрятанный инструмент, иначе нейтральный
  // Wrench: без этого на узком экране не видно, чем сейчас рисуешь.
  const hiddenToolActive = activeTool === 'thread' || activeTool === 'flood-fill' || activeTool === 'stamp';

  return (
    <div className="tool-group">
      <IconButton
        variant="chip"
        className="tool-btn"
        active={activeTool === 'pencil'}
        onClick={() => setActiveTool('pencil')}
        title="Pencil (B)"
        aria-pressed={activeTool === 'pencil'}
        icon={<Pencil size={14} />}
      />

      <IconButton
        variant="chip"
        className="tool-btn"
        active={activeTool === 'eraser'}
        onClick={() => setActiveTool(activeTool === 'eraser' ? 'pencil' : 'eraser')}
        title="Eraser (E)"
        icon={<EraserIcon size={14} />}
      />

      <div className={`tool-extras${open ? ' tool-extras--open' : ''}`} ref={ref}>
        <IconButton
          ref={triggerRef}
          variant="chip"
          className="tool-btn tool-extras__trigger"
          active={hiddenToolActive}
          onClick={() => setOpen(o => !o)}
          title="More tools"
          aria-haspopup="menu"
          aria-expanded={open}
          icon={activeTool === 'thread' ? <ThreadIcon size={14} />
            : activeTool === 'flood-fill' ? <PaintBucket size={14} />
            : activeTool === 'stamp' ? <Stamp size={14} />
            : <Wrench size={14} />}
        />

        <div className="tool-extras__panel">
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
              <IconButton
                variant="chip"
                className="tool-btn"
                active={activeTool === 'flood-fill'}
                onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
                title="Flood Fill (G)"
                aria-pressed={activeTool === 'flood-fill'}
                icon={<PaintBucket size={14} />}
              />

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
              <IconButton
                variant="chip"
                className="tool-btn"
                active={activeTool === 'flood-fill'}
                onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
                title="Flood Fill (G)"
                aria-pressed={activeTool === 'flood-fill'}
                icon={<PaintBucket size={14} />}
              />

              <div className="tool-btn-group">
                <IconButton
                  variant="chip"
                  className="tool-btn"
                  active={activeTool === 'stamp'}
                  onClick={() => setActiveTool(activeTool === 'stamp' ? 'pencil' : 'stamp')}
                  title="Stamp (S)"
                  aria-pressed={activeTool === 'stamp'}
                  icon={<Stamp size={14} />}
                />

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

          {stampMirrorProps && (
            <>
              <IconButton
                variant="chip"
                className="tool-btn"
                active={activeTool === 'flood-fill'}
                onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
                title="Flood Fill (G)"
                aria-pressed={activeTool === 'flood-fill'}
                icon={<PaintBucket size={14} />}
              />

              {/* Штамп есть у Peyote и Loom (в отличие от crossWeave), но без
                  бейджа anchor-edge — ни та ни другая техника не различает
                  «низ»/«верх» узора, якорь штампа всегда левый верхний угол
                  выделения (см. peyoteStamp.ts/loomStamp.ts). Только X-бейдж
                  сброса, как у силянки. */}
              <div className="tool-btn-group">
                <IconButton
                  variant="chip"
                  className="tool-btn"
                  active={activeTool === 'stamp'}
                  onClick={() => setActiveTool(activeTool === 'stamp' ? 'pencil' : 'stamp')}
                  title="Stamp (S)"
                  aria-pressed={activeTool === 'stamp'}
                  icon={<Stamp size={14} />}
                />

                {activeTool === 'stamp' && stampMirrorProps.hasStampPattern && (
                  <button
                    onClick={stampMirrorProps.onCancelStampPattern}
                    className="tool-btn-group__badge tool-btn-group__badge--cancel"
                    title="Reset stamp pattern (Esc/Alt)"
                  >
                    <X size={9} />
                  </button>
                )}
              </div>

              <MirrorMenu
                mirrorMode={stampMirrorProps.mirrorMode}
                setMirrorMode={stampMirrorProps.setMirrorMode}
                onMakeSymmetric={stampMirrorProps.onMakeSymmetric}
                canMakeSymmetric={stampMirrorProps.canMakeSymmetric}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
