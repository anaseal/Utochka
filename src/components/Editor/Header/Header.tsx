import { useEffect, useRef, useState } from 'react';
import {
  MoreHorizontal, RotateCcw, FlipHorizontal, PaintBucket, Stamp, Pencil,
  ArrowUpToLine, ArrowDownToLine, Image, Download, Upload, Share2,
} from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import './Header.css';
import { EraserIcon, EyedropperIcon, PendantIcon, SilyankaIcon, CrossWeaveIcon } from './icons';
import { DrawingTool } from '../../../hooks/useDrawing';
import { StampAnchorEdge } from '../../../utils/stamp';
import { APP_CONSTRAINTS, BEAD_THEME } from '../../../config/theme';
import { CROSS_WEAVE_THEME } from '../../../config/crossWeaveTheme';

export type Technique = 'silyanka' | 'crossWeave';

interface SharedHeaderProps {
  palette: string[];
  onPaletteChange: (palette: string[]) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  recentColors: string[];
  commitRecentColor: (color: string) => void;
  onClearAll: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onShareProject: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom?: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  technique: Technique;
  onTechniqueChange: (technique: Technique) => void;
  referenceWindowOpen: boolean;
  onToggleReferenceWindow: () => void;
}

interface SilyankaHeaderProps {
  gridWidth: number;
  gridHeight: number;
  topSpan: number;
  bottomSpan: number;
  onWidthChange: (delta: number) => void;
  onHeightChange: (delta: number) => void;
  onTopSpanChange: (delta: number) => void;
  onBottomSpanChange: (delta: number) => void;
  onTopEdgeReset: () => void;
  onBottomEdgeReset: () => void;
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  spacing: number;
  onSpacingChange: (delta: number) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSetWidth?: (v: number) => void;
  onSetHeight?: (v: number) => void;
  onSetTopSpan?: (v: number) => void;
  onSetBottomSpan?: (v: number) => void;
  onSetSpacing?: (v: number) => void;
  hasStampPattern: boolean;
  stampAnchorEdge: StampAnchorEdge;
  onToggleStampAnchorEdge: () => void;
}

interface CrossWeaveHeaderProps {
  gridWidth: number;
  gridHeight: number;
  spacing: number;
  onWidthChange: (delta: number) => void;
  onHeightChange: (delta: number) => void;
  onSpacingChange: (delta: number) => void;
  onSetWidth?: (v: number) => void;
  onSetHeight?: (v: number) => void;
  onSetSpacing?: (v: number) => void;
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
}

type HeaderProps = SharedHeaderProps & (
  | { technique: 'silyanka'; silyankaProps: SilyankaHeaderProps; crossWeaveProps?: undefined }
  | { technique: 'crossWeave'; crossWeaveProps: CrossWeaveHeaderProps; silyankaProps?: undefined }
);

type StepperVariant = 'bar' | 'overflow';

const Stepper = ({
  label,
  value,
  onDelta,
  onReset,
  variant = 'bar',
  onSet,
  inputValue,
  min,
  max,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  onDelta: (sign: -1 | 1) => void;
  onReset?: () => void;
  variant?: StepperVariant;
  onSet?: (value: number) => void;
  inputValue?: number;
  min?: number;
  max?: number;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = onSet !== undefined && inputValue !== undefined;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    if (!editable) return;
    setDraft(String(inputValue));
    setEditing(true);
  };

  const confirm = () => {
    if (!onSet) return;
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      let val = Math.round(parsed);
      if (min !== undefined) val = Math.max(min, val);
      if (max !== undefined) val = Math.min(max, val);
      onSet(val);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') setEditing(false);
  };

  const wrapperClass = variant === 'overflow' ? 'header__overflow-row' : 'grid-controls__group';
  const labelClass = variant === 'overflow' ? 'header__overflow-label' : 'grid-controls__label';

  const valueEl = editing ? (
    <input
      ref={inputRef}
      className="grid-controls__input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={confirm}
      onKeyDown={handleKeyDown}
      type="text"
      inputMode="numeric"
    />
  ) : (
    <span
      className={`grid-controls__value${editable ? ' grid-controls__value--editable' : ''}`}
      onClick={editable ? startEdit : undefined}
      title={editable ? 'Click to edit' : undefined}
    >
      {value}
    </span>
  );

  const actions = (
    <div className="grid-controls__actions">
      <button onClick={() => onDelta(-1)} className="grid-controls__btn">−</button>
      {valueEl}
      <button onClick={() => onDelta(1)} className="grid-controls__btn">+</button>
    </div>
  );

  const reset = onReset && (
    <button
      type="button"
      onClick={onReset}
      className="grid-controls__reset"
      title="Reset to default"
      aria-label="Reset to default"
    >
      <RotateCcw size={13} />
    </button>
  );

  return (
    <div className={wrapperClass}>
      <span className={labelClass}>{label}</span>
      {variant === 'overflow' ? (
        <>{reset}{actions}</>
      ) : (
        <>{actions}{reset}</>
      )}
    </div>
  );
};

export const Header = (props: HeaderProps) => {
  const {
    palette, onPaletteChange, activeColor, setActiveColor, activeTool, setActiveTool, recentColors, commitRecentColor, onClearAll,
    onSaveProject, onLoadProject, onShareProject,
    zoom, onZoomChange, onSetZoom,
    onUndo, onRedo, canUndo, canRedo,
    technique, onTechniqueChange,
    referenceWindowOpen, onToggleReferenceWindow,
  } = props;

  const [hasEyeDropper] = useState(() => 'EyeDropper' in window);
  const [pickerOpen, setPickerOpen] = useState(false);
  const customTriggerRef = useRef<HTMLButtonElement>(null);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement>(null);

  const loadInputRef = useRef<HTMLInputElement>(null);
  const handleLoadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onLoadProject(file);
  };

  useEffect(() => {
    if (!overflowOpen) return;
    const onDown = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverflowOpen(false);
        overflowTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [overflowOpen]);

  const isCustomColor = !palette.includes(activeColor);

  // Ластик не работает с цветом, поэтому выбор цвета выводит из него;
  // остальные инструменты (заливка, штамп) цвет используют — их выбор не сбрасывает.
  const selectColor = (color: string) => {
    setActiveColor(color);
    if (activeTool === 'eraser') setActiveTool('pencil');
  };

  const handleEyeDropper = async () => {
    try {
      const dropper = new (window as any).EyeDropper();
      const { sRGBHex } = await dropper.open();
      selectColor(sRGBHex);
      commitRecentColor(sRGBHex);
    } catch {
      // cancelled
    }
  };

  const handlePickerConfirm = (color: string) => {
    selectColor(color);
    commitRecentColor(color);
    setPickerOpen(false);
  };

  const silyankaProps = props.technique === 'silyanka' ? props.silyankaProps : undefined;
  const crossWeaveProps = props.technique === 'crossWeave' ? props.crossWeaveProps : undefined;

  return (
    <header className="header">
      <nav className="header__nav">
        <div className="technique-switch" role="group" aria-label="Switch technique">
          <button
            onClick={() => onTechniqueChange('silyanka')}
            className={`technique-switch__btn ${technique === 'silyanka' ? 'technique-switch__btn--active' : ''}`}
            title="Traditional Ukrainian beadwork"
            aria-pressed={technique === 'silyanka'}
          >
            <SilyankaIcon size={25} />
            <span>sylianka</span>
          </button>
          <button
            onClick={() => onTechniqueChange('crossWeave')}
            className={`technique-switch__btn ${technique === 'crossWeave' ? 'technique-switch__btn--active' : ''}`}
            title="Right-Angle Weave"
            aria-pressed={technique === 'crossWeave'}
          >
            <CrossWeaveIcon size={25} />
            <span>RAW</span>
          </button>
        </div>

        <div className="header__divider" />

        <div className="palette">
          <div className="palette__grid">
            <div className="palette__row">
              {palette.map((color) => (
                <button
                  key={color}
                  onClick={() => selectColor(color)}
                  className={`palette__color ${activeTool !== 'eraser' && activeColor === color ? 'palette__color--active' : ''}`}
                  style={{ '--color-value': color } as React.CSSProperties}
                />
              ))}
            </div>

            <div className="palette__row" role="group" aria-label="Recent colors">
              {Array.from({ length: BEAD_THEME.ui.recentColorsLimit }).map((_, i) => {
                const color = recentColors[i];
                if (!color) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="palette__recent-slot palette__recent-slot--empty"
                      aria-hidden="true"
                    />
                  );
                }
                const isActive = activeTool !== 'eraser' && activeColor === color;
                return (
                  <button
                    key={color}
                    onClick={() => selectColor(color)}
                    className={`palette__color ${isActive ? 'palette__color--active' : ''}`}
                    style={{ '--color-value': color } as React.CSSProperties}
                    title={color}
                  />
                );
              })}
            </div>
          </div>

          <div className="palette__custom">
            <button
              ref={customTriggerRef}
              className="palette__color palette__color--custom-trigger"
              onClick={() => setPickerOpen(o => !o)}
              title="Custom color"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              style={{ background: 'conic-gradient(from 0deg, #ff4757, #ff9f43, #ffd32a, #2ed573, #22d3ee, #1e90ff, #e879f9, #ff4757)' }}
            />
            {pickerOpen && (
              <ColorPicker
                initialColor={isCustomColor ? activeColor : '#ffffff'}
                onConfirm={handlePickerConfirm}
                onClose={() => setPickerOpen(false)}
                onReplacePalette={onPaletteChange}
                triggerRef={customTriggerRef}
              />
            )}
          </div>

          {hasEyeDropper && (
            <button
              className="palette__eyedropper"
              onClick={handleEyeDropper}
              title="Pick color from screen"
            >
              <EyedropperIcon size={14} />
            </button>
          )}
        </div>

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

            <button
              onClick={() => crossWeaveProps.setMirrorMode(!crossWeaveProps.mirrorMode)}
              className={`tool-btn ${crossWeaveProps.mirrorMode ? 'tool-btn--active' : ''}`}
              title="Mirror Mode (M)"
              aria-pressed={crossWeaveProps.mirrorMode}
            >
              <FlipHorizontal size={14} />
            </button>
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
                <button
                  onClick={silyankaProps.onToggleStampAnchorEdge}
                  className="tool-btn-group__badge"
                  title={silyankaProps.stampAnchorEdge === 'top'
                    ? 'Stamp anchor point: top (click or Shift to switch to bottom, Alt to reset stamp)'
                    : 'Stamp anchor point: bottom (click or Shift to switch to top, Alt to reset stamp)'}
                  aria-pressed={silyankaProps.stampAnchorEdge === 'bottom'}
                >
                  {silyankaProps.stampAnchorEdge === 'top'
                    ? <ArrowUpToLine size={9} />
                    : <ArrowDownToLine size={9} />}
                </button>
              )}
            </div>

            <button
              onClick={() => silyankaProps.setMirrorMode(!silyankaProps.mirrorMode)}
              className={`tool-btn ${silyankaProps.mirrorMode ? 'tool-btn--active' : ''}`}
              title="Mirror Mode (M)"
              aria-pressed={silyankaProps.mirrorMode}
            >
              <FlipHorizontal size={14} />
            </button>
          </>
        )}

        <div className="header__divider header__divider--collapsible" />

        <div className="grid-controls grid-controls--collapsible grid-controls--stacked">
          <Stepper
            label="Width"
            value={silyankaProps ? silyankaProps.gridWidth : crossWeaveProps!.gridWidth}
            onDelta={silyankaProps ? silyankaProps.onWidthChange : crossWeaveProps!.onWidthChange}
            onSet={silyankaProps ? silyankaProps.onSetWidth : crossWeaveProps!.onSetWidth}
            inputValue={silyankaProps ? silyankaProps.gridWidth : crossWeaveProps!.gridWidth}
            min={1}
          />
          <Stepper
            label="Height"
            value={silyankaProps ? silyankaProps.gridHeight : crossWeaveProps!.gridHeight}
            onDelta={silyankaProps ? silyankaProps.onHeightChange : crossWeaveProps!.onHeightChange}
            onSet={silyankaProps ? silyankaProps.onSetHeight : crossWeaveProps!.onSetHeight}
            inputValue={silyankaProps ? silyankaProps.gridHeight : crossWeaveProps!.gridHeight}
            min={silyankaProps ? 2 : 1}
          />
        </div>

        {silyankaProps && (
          <>
            <div className="header__divider header__divider--collapsible" />

            <div className="grid-controls grid-controls--collapsible grid-controls--stacked">
              <Stepper
                label={<span className="grid-controls__label-stacked">Top<br />Edge</span>}
                value={silyankaProps.topSpan}
                onDelta={silyankaProps.onTopSpanChange}
                onReset={silyankaProps.onTopEdgeReset}
                onSet={silyankaProps.onSetTopSpan}
                inputValue={silyankaProps.topSpan}
                min={3}
                max={10}
              />
              <Stepper
                label={<span className="grid-controls__label-stacked">Bottom<br />Edge</span>}
                value={silyankaProps.bottomSpan}
                onDelta={silyankaProps.onBottomSpanChange}
                onReset={silyankaProps.onBottomEdgeReset}
                onSet={silyankaProps.onSetBottomSpan}
                inputValue={silyankaProps.bottomSpan}
                min={3}
                max={10}
              />
            </div>
          </>
        )}

        <div className="header__divider" />

        <div className="grid-controls grid-controls--stacked">
          <Stepper
            label="Zoom"
            value={`${Math.round(zoom * 100)}%`}
            onDelta={(s) => onZoomChange(s * APP_CONSTRAINTS.zoomStep)}
            onSet={onSetZoom ? (v) => onSetZoom(v / 100) : undefined}
            inputValue={Math.round(zoom * 100)}
            min={APP_CONSTRAINTS.minZoom * 100}
            max={APP_CONSTRAINTS.maxZoom * 100}
          />
          {silyankaProps && (
            <Stepper
              label="Spacing"
              value={silyankaProps.spacing}
              onDelta={(s) => silyankaProps.onSpacingChange(s * BEAD_THEME.constraints.spacingStep)}
              onSet={silyankaProps.onSetSpacing}
              inputValue={silyankaProps.spacing}
              min={BEAD_THEME.constraints.minSpacing}
              max={BEAD_THEME.constraints.maxSpacing}
            />
          )}
          {crossWeaveProps && (
            <Stepper
              label="Spacing"
              value={crossWeaveProps.spacing}
              onDelta={(s) => crossWeaveProps.onSpacingChange(s * CROSS_WEAVE_THEME.constraints.spacingStep)}
              onSet={crossWeaveProps.onSetSpacing}
              inputValue={crossWeaveProps.spacing}
              min={CROSS_WEAVE_THEME.constraints.minSpacing}
              max={CROSS_WEAVE_THEME.constraints.maxSpacing}
            />
          )}
        </div>

        {silyankaProps && (
          <div className="header__overflow" ref={overflowRef}>
            <button
              ref={overflowTriggerRef}
              type="button"
              className="header__overflow-trigger"
              aria-label="Grid settings"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              onClick={() => setOverflowOpen(o => !o)}
            >
              <MoreHorizontal size={18} />
            </button>
            {overflowOpen && (
              <div className="header__overflow-panel" role="menu">
                <Stepper variant="overflow" label="Width" value={silyankaProps.gridWidth} onDelta={silyankaProps.onWidthChange} onSet={silyankaProps.onSetWidth} inputValue={silyankaProps.gridWidth} min={1} />
                <Stepper variant="overflow" label="Height" value={silyankaProps.gridHeight} onDelta={silyankaProps.onHeightChange} onSet={silyankaProps.onSetHeight} inputValue={silyankaProps.gridHeight} min={2} />
                <Stepper variant="overflow" label="Top Edge" value={silyankaProps.topSpan} onDelta={silyankaProps.onTopSpanChange} onReset={silyankaProps.onTopEdgeReset} onSet={silyankaProps.onSetTopSpan} inputValue={silyankaProps.topSpan} min={3} max={10} />
                <Stepper variant="overflow" label="Bottom Edge" value={silyankaProps.bottomSpan} onDelta={silyankaProps.onBottomSpanChange} onReset={silyankaProps.onBottomEdgeReset} onSet={silyankaProps.onSetBottomSpan} inputValue={silyankaProps.bottomSpan} min={3} max={10} />
              </div>
            )}
          </div>
        )}

        <div className="header__divider" />

        <div className="grid-controls">
          <div className="grid-controls__actions">
            <button onClick={onUndo} disabled={!canUndo} className="grid-controls__btn" title="Undo (Ctrl+Z)">↩</button>
            <button onClick={onRedo} disabled={!canRedo} className="grid-controls__btn" title="Redo (Ctrl+Y)">↪</button>
            <button onClick={onClearAll} className="grid-controls__btn grid-controls__btn--reset" title="Clear All">CLEAR</button>
            <button onClick={onSaveProject} className="grid-controls__btn" title="Save project to file">
              <Download size={14} />
            </button>
            <button onClick={() => loadInputRef.current?.click()} className="grid-controls__btn" title="Load project from file">
              <Upload size={14} />
            </button>
            <button onClick={onShareProject} className="grid-controls__btn" title="Copy share link">
              <Share2 size={14} />
            </button>
            <input
              ref={loadInputRef}
              type="file"
              accept="application/json"
              className="header__file-input"
              onChange={handleLoadInputChange}
            />
          </div>
        </div>

        <div className="header__divider" />

        <button
          onClick={onToggleReferenceWindow}
          className={`tool-btn ${referenceWindowOpen ? 'tool-btn--active' : ''}`}
          title="Reference image"
          aria-pressed={referenceWindowOpen}
        >
          <Image size={14} />
        </button>

        {silyankaProps && (
          <button
            onClick={silyankaProps.onToggleSidebar}
            className={`tool-btn tool-btn--lg ${silyankaProps.sidebarOpen ? 'tool-btn--active' : ''}`}
            title="Pendant library"
            aria-pressed={silyankaProps.sidebarOpen}
          >
            <PendantIcon size={22} />
          </button>
        )}
      </nav>
    </header>
  );
};
