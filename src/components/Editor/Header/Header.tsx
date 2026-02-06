/* src/components/Editor/Header.tsx */
import './Header.css';

interface HeaderProps {
  palette: string[];
  activeColor: string;
  setActiveColor: (color: string) => void;
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
}

export const Header = ({ 
  palette, activeColor, setActiveColor,
  gridWidth, gridHeight, topSpan, bottomSpan,
  onWidthChange, onHeightChange, onTopSpanChange, onBottomSpanChange,
  zoom, onZoomChange, onZoomReset
}: HeaderProps) => {
  return (
    <header className="header">
      <nav className="header__nav">
        <div className="palette">
          {palette.map((color) => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`palette__color ${activeColor === color ? 'palette__color--active' : ''}`}
              style={{ '--color-value': color } as React.CSSProperties}
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
      </nav>
    </header>
  );
};