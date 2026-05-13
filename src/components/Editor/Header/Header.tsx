/* src/components/Editor/Header.tsx */
import { useRef, useState } from 'react';
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
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Header = ({
  palette, activeColor, setActiveColor, activeTool, setActiveTool, onClearAll,
  gridWidth, gridHeight, topSpan, bottomSpan,
  onWidthChange, onHeightChange, onTopSpanChange, onBottomSpanChange,
  zoom, onZoomChange, onZoomReset,
  onUndo, onRedo, canUndo, canRedo
}: HeaderProps) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hasEyeDropper] = useState(() => 'EyeDropper' in window);

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

        <div className="header__divider" />

        <div className="grid-controls">
          <div className="grid-controls__group">
            <span className="grid-controls__label">Width</span>
            <div className="grid-controls__actions">
              <button onClick={() => onWidthChange(-1)} className="grid-controls__btn">−</button>
              <span className="grid-controls__value">{gridWidth}</span>
              <button onClick={() => onWidthChange(1)} className="grid-controls__btn">+</button>
            </div>
          </div>
          <div className="grid-controls__group">
            <span className="grid-controls__label">Height</span>
            <div className="grid-controls__actions">
              <button onClick={() => onHeightChange(-1)} className="grid-controls__btn">−</button>
              <span className="grid-controls__value">{gridHeight}</span>
              <button onClick={() => onHeightChange(1)} className="grid-controls__btn">+</button>
            </div>
          </div>
        </div>

        <div className="header__divider" />

        <div className="grid-controls">
          <div className="grid-controls__group">
            <span className="grid-controls__label">Top Edge</span>
            <div className="grid-controls__actions">
              <button onClick={() => onTopSpanChange(-1)} className="grid-controls__btn">−</button>
              <span className="grid-controls__value">{topSpan}</span>
              <button onClick={() => onTopSpanChange(1)} className="grid-controls__btn">+</button>
            </div>
          </div>
          <div className="grid-controls__group">
            <span className="grid-controls__label">Bottom Edge</span>
            <div className="grid-controls__actions">
              <button onClick={() => onBottomSpanChange(-1)} className="grid-controls__btn">−</button>
              <span className="grid-controls__value">{bottomSpan}</span>
              <button onClick={() => onBottomSpanChange(1)} className="grid-controls__btn">+</button>
            </div>
          </div>
        </div>

        <div className="header__divider" />

        <div className="grid-controls">
          <div className="grid-controls__group">
            <span className="grid-controls__label">Zoom</span>
            <div className="grid-controls__actions">
              <button onClick={() => onZoomChange(-0.1)} className="grid-controls__btn">−</button>
              <span className="grid-controls__value">{Math.round(zoom * 100)}%</span>
              <button onClick={() => onZoomChange(0.1)} className="grid-controls__btn">+</button>
            </div>
          </div>
        </div>

        <div className="header__divider" />

        <div className="grid-controls">
          <div className="grid-controls__actions">
            <button onClick={onUndo} disabled={!canUndo} className="grid-controls__btn" title="Undo (Ctrl+Z)">↩</button>
            <button onClick={onRedo} disabled={!canRedo} className="grid-controls__btn" title="Redo (Ctrl+Y)">↪</button>
            <button onClick={onClearAll} className="grid-controls__btn grid-controls__btn--reset" title="Clear All">CLEAR</button>
          </div>
        </div>
      </nav>
      <input
        ref={colorInputRef}
        type="color"
        value={safeHex}
        onChange={e => { setActiveColor(e.target.value); setActiveTool('pencil'); }}
        style={{ position: 'fixed', top: '-200px', left: '-200px', opacity: 0 }}
      />
    </header>
  );
};
