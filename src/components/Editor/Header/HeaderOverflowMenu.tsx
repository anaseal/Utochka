import { RefObject } from 'react';
import {
  MoreHorizontal, Download, Upload, Share2, FolderOpen, RotateCcw, Maximize2, Minimize2,
} from 'lucide-react';
import { Stepper } from '../../common/Stepper';
import { WeaveHelp } from './WeaveHelp';
import { APP_CONSTRAINTS } from '../../../config/theme';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { SharedHeaderProps, Technique } from './Header.types';

interface HeaderOverflowMenuProps {
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom?: (v: number) => void;
  onSaveProject: () => void;
  onShareProject: () => void;
  onOpenProjectGallery: () => void;
  loadInputRef: RefObject<HTMLInputElement | null>;
  weaveMode: boolean;
  technique: Technique;
  weaveControls: SharedHeaderProps['weaveControls'];
}

// Попап «⋯»: на ≤767.98px сюда переезжают дубли Zoom/Save-Load-Share (и,
// в режиме плетения, Fullscreen/Reset/«?») из основной строки хедера — там
// им не хватает места (см. Header.css).
export const HeaderOverflowMenu = ({
  zoom, onZoomChange, onSetZoom, onSaveProject, onShareProject, onOpenProjectGallery, loadInputRef,
  weaveMode, technique, weaveControls,
}: HeaderOverflowMenuProps) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();

  return (
    <div className="header__overflow" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className="header__overflow-trigger"
        aria-label="More settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="header__overflow-panel" role="menu">
          {/* ≤767.98px: дубли Zoom/Save-Load-Share, скрытых из основной
              строки хедера на этом брейкпоинте (см. Header.css). На более широких
              экранах эти оригиналы и так видны в строке — блок скрыт. */}
          <div className="header__overflow-mobile-extra">
            <Stepper
              variant="overflow"
              label="Zoom"
              value={`${Math.round(zoom * 100)}%`}
              onDelta={(s) => onZoomChange(s * APP_CONSTRAINTS.zoomStep)}
              onSet={onSetZoom ? (v) => onSetZoom(v / 100) : undefined}
              inputValue={Math.round(zoom * 100)}
              min={APP_CONSTRAINTS.minZoom * 100}
              max={APP_CONSTRAINTS.maxZoom * 100}
            />
            <div className="header__overflow-row">
              <span className="header__overflow-label">Save / Load / Share / Projects</span>
              <div className="grid-controls__actions">
                <button onClick={onSaveProject} className="grid-controls__btn" title="Save project to file">
                  <Download size={14} />
                </button>
                <button onClick={() => loadInputRef.current?.click()} className="grid-controls__btn" title="Load project from file">
                  <Upload size={14} />
                </button>
                <button onClick={onShareProject} className="grid-controls__btn" title="Copy share link">
                  <Share2 size={14} />
                </button>
                <button onClick={onOpenProjectGallery} className="grid-controls__btn" title="Saved projects">
                  <FolderOpen size={14} />
                </button>
              </div>
            </div>
            {/* Reset/«?» режима плетения: на ≤767.98px их дубли в основной
                строке скрыты (см. .header__weave-desktop-only, Header.css) —
                строка WeaveControls не помещается в хедер даже после
                разбивки на 2 ряда. Тот же приём переноса в overflow, что и
                у Save/Load/Share выше. */}
            {weaveMode && (
              <div className="header__overflow-row">
                <span className="header__overflow-label">Weave mode</span>
                <div className="grid-controls__actions">
                  <button
                    onClick={weaveControls.onToggleFullscreen}
                    className={`grid-controls__btn ${weaveControls.isFullscreen ? 'grid-controls__btn--on' : ''}`}
                    title={weaveControls.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    aria-pressed={weaveControls.isFullscreen}
                  >
                    {weaveControls.isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button
                    onClick={weaveControls.onReset}
                    disabled={weaveControls.markedCount === 0}
                    className="grid-controls__btn grid-controls__btn--danger"
                    title="Reset all progress"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <WeaveHelp technique={technique} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
