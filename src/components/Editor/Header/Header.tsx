import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import './Header.css';
import eraserIcon from "../../../assets/eraser.svg";
import colorPickerIcon from "../../../assets/colorpicker.svg";
import { DrawingTool } from '../../../hooks/useDrawing';

interface HeaderProps {
  palette: string[];
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  onClearAll: () => void;
  gridWidth: number;
  gridHeight: number;
  topSpan: number;
  bottomSpan: number;
  onWidthChange: (delta: number) => void;
  onHeightChange: (delta: number) => void;
  onTopSpanChange: (delta: number) => void;
  onBottomSpanChange: (delta: number) => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type StepperVariant = 'bar' | 'overflow';

const Stepper = ({
  label,
  value,
  onDelta,
  variant = 'bar',
}: {
  label: string;
  value: React.ReactNode;
  onDelta: (sign: -1 | 1) => void;
  variant?: StepperVariant;
}) => {
  const wrapperClass = variant === 'overflow' ? 'header__overflow-row' : 'grid-controls__group';
  const labelClass = variant === 'overflow' ? 'header__overflow-label' : 'grid-controls__label';
  return (
    <div className={wrapperClass}>
      <span className={labelClass}>{label}</span>
      <div className="grid-controls__actions">
        <button onClick={() => onDelta(-1)} className="grid-controls__btn">−</button>
        <span className="grid-controls__value">{value}</span>
        <button onClick={() => onDelta(1)} className="grid-controls__btn">+</button>
      </div>
    </div>
  );
};

export const Header = ({
  palette, activeColor, setActiveColor, activeTool, setActiveTool, onClearAll,
  gridWidth, gridHeight, topSpan, bottomSpan,
  onWidthChange, onHeightChange, onTopSpanChange, onBottomSpanChange,
  zoom, onZoomChange,
  onUndo, onRedo, canUndo, canRedo
}: HeaderProps) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hasEyeDropper] = useState(() => 'EyeDropper' in window);

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
  const isCustomActive = activeTool === 'pencil' && isCustomColor;

  const handleEyeDropper = async () => {
    try {
      const dropper = new (window as any).EyeDropper();
      const { sRGBHex } = await dropper.open();
      setActiveColor(sRGBHex);
      setActiveTool('pencil');
    } catch {
      // cancelled
    }
  };

  const safeHex = /^#[0-9a-f]{6}$/i.test(activeColor) ? activeColor : '#ffffff';

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

          <div className="palette__divider" />

          <div className="palette__custom">
            <button
              className={`palette__color ${isCustomActive ? 'palette__color--active' : ''}`}
              onClick={() => colorInputRef.current?.click()}
              title="Custom color"
              style={
                isCustomActive
                  ? { background: activeColor } as React.CSSProperties
                  : { background: 'conic-gradient(from 0deg, #ff4757, #ff9f43, #ffd32a, #2ed573, #22d3ee, #1e90ff, #e879f9, #ff4757)' } as React.CSSProperties
              }
            />
            <input
              ref={colorInputRef}
              type="color"
              value={safeHex}
              onChange={e => { setActiveColor(e.target.value); setActiveTool('pencil'); }}
              className="palette__custom-input"
              aria-hidden="true"
              tabIndex={-1}
            />
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

        <div className="header__divider header__divider--collapsible" />

        <div className="grid-controls grid-controls--collapsible">
          <Stepper label="Width" value={gridWidth} onDelta={onWidthChange} />
          <Stepper label="Height" value={gridHeight} onDelta={onHeightChange} />
        </div>

        <div className="header__divider header__divider--collapsible" />

        <div className="grid-controls grid-controls--collapsible">
          <Stepper label="Top Edge" value={topSpan} onDelta={onTopSpanChange} />
          <Stepper label="Bottom Edge" value={bottomSpan} onDelta={onBottomSpanChange} />
        </div>

        <div className="header__divider" />

        <div className="grid-controls">
          <Stepper
            label="Zoom"
            value={`${Math.round(zoom * 100)}%`}
            onDelta={(s) => onZoomChange(s * 0.1)}
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
              <Stepper variant="overflow" label="Width" value={gridWidth} onDelta={onWidthChange} />
              <Stepper variant="overflow" label="Height" value={gridHeight} onDelta={onHeightChange} />
              <Stepper variant="overflow" label="Top Edge" value={topSpan} onDelta={onTopSpanChange} />
              <Stepper variant="overflow" label="Bottom Edge" value={bottomSpan} onDelta={onBottomSpanChange} />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
