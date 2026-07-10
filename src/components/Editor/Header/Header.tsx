import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, RotateCcw, FlipHorizontal, Layers, PaintBucket, Stamp } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import './Header.css';
import eraserIcon from "../../../assets/eraser.svg";
import colorPickerIcon from "../../../assets/colorpicker.svg";
import { DrawingTool } from '../../../hooks/useDrawing';
import { BEAD_THEME } from '../../../config/theme';

interface HeaderProps {
  palette: readonly string[];
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  recentColors: string[];
  commitRecentColor: (color: string) => void;
  onClearAll: () => void;
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
  zoom: number;
  onZoomChange: (delta: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSetWidth?: (v: number) => void;
  onSetHeight?: (v: number) => void;
  onSetTopSpan?: (v: number) => void;
  onSetBottomSpan?: (v: number) => void;
  onSetZoom?: (v: number) => void;
}

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

export const Header = ({
  palette, activeColor, setActiveColor, activeTool, setActiveTool, recentColors, commitRecentColor, onClearAll,
  gridWidth, gridHeight, topSpan, bottomSpan,
  onWidthChange, onHeightChange, onTopSpanChange, onBottomSpanChange,
  onTopEdgeReset, onBottomEdgeReset,
  mirrorMode, setMirrorMode,
  zoom, onZoomChange,
  onUndo, onRedo, canUndo, canRedo,
  sidebarOpen, onToggleSidebar,
  onSetWidth, onSetHeight, onSetTopSpan, onSetBottomSpan, onSetZoom,
}: HeaderProps) => {
  const [hasEyeDropper] = useState(() => 'EyeDropper' in window);
  const [pickerOpen, setPickerOpen] = useState(false);
  const customTriggerRef = useRef<HTMLButtonElement>(null);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement>(null);

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

  const handleEyeDropper = async () => {
    try {
      const dropper = new (window as any).EyeDropper();
      const { sRGBHex } = await dropper.open();
      setActiveColor(sRGBHex);
      commitRecentColor(sRGBHex);
      setActiveTool('pencil');
    } catch {
      // cancelled
    }
  };

  const handlePickerConfirm = (color: string) => {
    setActiveColor(color);
    commitRecentColor(color);
    setActiveTool('pencil');
    setPickerOpen(false);
  };

  return (
    <header className="header">
      <nav className="header__nav">
        <div className="palette">
          {palette.map((color) => (
            <button
              key={color}
              onClick={() => { setActiveColor(color); setActiveTool('pencil'); }}
              className={`palette__color ${activeTool === 'pencil' && activeColor === color ? 'palette__color--active' : ''}`}
              style={{ '--color-value': color } as React.CSSProperties}
            />
          ))}

          <div className="palette__recent" role="group" aria-label="Recent colors">
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
              const isActive = activeTool === 'pencil' && activeColor === color;
              return (
                <button
                  key={color}
                  onClick={() => { setActiveColor(color); setActiveTool('pencil'); }}
                  className={`palette__color ${isActive ? 'palette__color--active' : ''}`}
                  style={{ '--color-value': color } as React.CSSProperties}
                  title={color}
                />
              );
            })}
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
              <img src={colorPickerIcon} alt="Color Picker" />
            </button>
          )}
        </div>

        <button
          onClick={() => setActiveTool(activeTool === 'eraser' ? 'pencil' : 'eraser')}
          className={`tool-btn ${activeTool === 'eraser' ? 'tool-btn--active' : ''}`}
          title="Eraser"
        >
          <img src={eraserIcon} alt="Eraser" />
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
          className={`tool-btn ${activeTool === 'flood-fill' ? 'tool-btn--active' : ''}`}
          title="Flood Fill"
          aria-pressed={activeTool === 'flood-fill'}
        >
          <PaintBucket size={14} />
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'stamp' ? 'pencil' : 'stamp')}
          className={`tool-btn ${activeTool === 'stamp' ? 'tool-btn--active' : ''}`}
          title="Stamp"
          aria-pressed={activeTool === 'stamp'}
        >
          <Stamp size={14} />
        </button>

        <button
          onClick={() => setMirrorMode(!mirrorMode)}
          className={`tool-btn ${mirrorMode ? 'tool-btn--active' : ''}`}
          title="Mirror Mode"
          aria-pressed={mirrorMode}
        >
          <FlipHorizontal size={14} />
        </button>

        <div className="header__divider header__divider--collapsible" />

        <div className="grid-controls grid-controls--collapsible">
          <Stepper label="Width" value={gridWidth} onDelta={onWidthChange} onSet={onSetWidth} inputValue={gridWidth} min={1} />
          <Stepper label="Height" value={gridHeight} onDelta={onHeightChange} onSet={onSetHeight} inputValue={gridHeight} min={1} />
        </div>

        <div className="header__divider header__divider--collapsible" />

        <div className="grid-controls grid-controls--collapsible">
          <Stepper
            label={<span className="grid-controls__label-stacked">Top<br />Edge</span>}
            value={topSpan}
            onDelta={onTopSpanChange}
            onReset={onTopEdgeReset}
            onSet={onSetTopSpan}
            inputValue={topSpan}
            min={3}
            max={10}
          />
          <Stepper
            label={<span className="grid-controls__label-stacked">Bottom<br />Edge</span>}
            value={bottomSpan}
            onDelta={onBottomSpanChange}
            onReset={onBottomEdgeReset}
            onSet={onSetBottomSpan}
            inputValue={bottomSpan}
            min={3}
            max={10}
          />
        </div>

        <div className="header__divider" />

        <div className="grid-controls">
          <Stepper
            label="Zoom"
            value={`${Math.round(zoom * 100)}%`}
            onDelta={(s) => onZoomChange(s * 0.1)}
            onSet={onSetZoom ? (v) => onSetZoom(v / 100) : undefined}
            inputValue={Math.round(zoom * 100)}
            min={25}
            max={300}
          />
        </div>

        <div className="header__divider" />

        <div className="grid-controls">
          <div className="grid-controls__actions">
            <button onClick={onUndo} disabled={!canUndo} className="grid-controls__btn" title="Undo (Ctrl+Z)">↩</button>
            <button onClick={onRedo} disabled={!canRedo} className="grid-controls__btn" title="Redo (Ctrl+Y)">↪</button>
            <button onClick={onClearAll} className="grid-controls__btn grid-controls__btn--reset" title="Clear All">CLEAR</button>
          </div>
        </div>

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
              <Stepper variant="overflow" label="Width" value={gridWidth} onDelta={onWidthChange} onSet={onSetWidth} inputValue={gridWidth} min={1} />
              <Stepper variant="overflow" label="Height" value={gridHeight} onDelta={onHeightChange} onSet={onSetHeight} inputValue={gridHeight} min={1} />
              <Stepper variant="overflow" label="Top Edge" value={topSpan} onDelta={onTopSpanChange} onReset={onTopEdgeReset} onSet={onSetTopSpan} inputValue={topSpan} min={3} max={10} />
              <Stepper variant="overflow" label="Bottom Edge" value={bottomSpan} onDelta={onBottomSpanChange} onReset={onBottomEdgeReset} onSet={onSetBottomSpan} inputValue={bottomSpan} min={3} max={10} />
            </div>
          )}
        </div>

        <div className="header__divider" />

        <button
          onClick={onToggleSidebar}
          className={`tool-btn ${sidebarOpen ? 'tool-btn--active' : ''}`}
          title="Библиотека подвесок"
          aria-pressed={sidebarOpen}
        >
          <Layers size={14} />
        </button>
      </nav>
    </header>
  );
};
