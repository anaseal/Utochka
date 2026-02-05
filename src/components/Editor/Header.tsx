/* src/components/Editor/Header.tsx */
import './Header.css';

interface HeaderProps {
  palette: string[];
  activeColor: string;
  setActiveColor: (color: string) => void;
  gridWidth: number;
  gridHeight: number;
  onWidthChange: (delta: number) => void;
  onHeightChange: (delta: number) => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onZoomReset: () => void;
}

export const Header = ({ 
  palette, 
  activeColor, 
  setActiveColor,
  gridWidth,
  gridHeight,
  onWidthChange,
  onHeightChange,
  zoom,
  onZoomChange,
  onZoomReset
}: HeaderProps) => {
  return (
    <header className="header">
      <nav className="header__nav" aria-label="Editor Controls">
        <div className="palette" aria-label="Color Palette">
          {palette.map((color) => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`palette__color ${activeColor === color ? 'palette__color--active' : ''}`}
              style={{ '--color-value': color } as React.CSSProperties}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>

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
            <span className="grid-controls__label">Zoom</span>
            <div className="grid-controls__actions">
              <button onClick={() => onZoomChange(-0.25)} className="grid-controls__btn">−</button>
              <span className="grid-controls__value" style={{ minWidth: '45px' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => onZoomChange(0.25)} className="grid-controls__btn">+</button>
              <button 
                onClick={onZoomReset} 
                className="grid-controls__btn grid-controls__btn--reset"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};