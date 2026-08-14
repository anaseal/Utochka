import { PaintBucket, Stamp, Pencil, Wrench } from 'lucide-react';
import './HeaderToolGroup.css';
import { EraserIcon, ThreadIcon } from './icons';
import { IconButton } from '../../common/IconButton';
import { MirrorMenu } from './MirrorMenu';
import { StampMenu, StampMenuPanel, StampControls } from './StampMenu';
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

  // Настройки штампа одним набором на все техники: плашку с ними показывают
  // два места сразу — сама кнопка штампа и плавающая копия в конце ряда
  // (см. StampMenu.css), и разъезжаться их содержимому нельзя.
  const stampControls: StampControls | null = silyankaProps
    ? {
      hasStampPattern: silyankaProps.hasStampPattern,
      onCancelStampPattern: silyankaProps.onCancelStampPattern,
      anchorEdge: silyankaProps.stampAnchorEdge,
      onToggleAnchorEdge: silyankaProps.onToggleStampAnchorEdge,
    }
    : stampMirrorProps
      ? {
        hasStampPattern: stampMirrorProps.hasStampPattern,
        onCancelStampPattern: stampMirrorProps.onCancelStampPattern,
      }
      : null;

  // Меню «Инструменты» (.tool-extras): на ≤599.98px всё, что после карандаша
  // и ластика, уезжает под одну кнопку — иначе строка хедера не укладывается
  // в два ровных ряда (см. Header.css). На более широких экранах и обёртка, и
  // панель «растворяются» (display: contents), и ветки ниже стоят прямо
  // в строке — тем же приёмом, каким PaletteWidget прячет палитру под иконку.
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

              {stampControls && (
                <StampMenu activeTool={activeTool} setActiveTool={setActiveTool} {...stampControls} />
              )}

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

              {/* Штамп есть у Peyote и Loom (в отличие от crossWeave), но его
                  плашка здесь из одной кнопки сброса — ни та ни другая техника
                  не различает «низ»/«верх» узора, якорь штампа всегда левый
                  верхний угол выделения (см. peyoteStamp.ts/loomStamp.ts). */}
              {stampControls && (
                <StampMenu activeTool={activeTool} setActiveTool={setActiveTool} {...stampControls} />
              )}

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

      {/* Плавающая копия плашки штампа — соседом меню «Инструменты», а не
          внутри него: на ≤599.98px кнопка штампа уезжает в его попап, и
          собственная плашка кнопки гасла бы вместе с попапом ровно тогда,
          когда нужна — узор захватывают уже на полотне, а тап по полотну
          попап закрывает. Видна только на этой ширине и только при закрытом
          попапе (см. StampMenu.css), так что одновременно двух плашек на
          экране не бывает. */}
      {stampControls && activeTool === 'stamp' && <StampMenuPanel floating {...stampControls} />}
    </div>
  );
};
