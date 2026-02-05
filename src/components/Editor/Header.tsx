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
}

export const Header = ({ 
  palette, 
  activeColor, 
  setActiveColor,
  gridWidth,
  gridHeight,
  onWidthChange,
  onHeightChange
}: HeaderProps) => {
  return (
    <header className="header">
      <nav className="header__nav" aria-label="Editor Controls">
        {/* Блок палитры */}
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

        {/* Разделитель */}
        <div className="header__divider" />

        {/* Блок управления сеткой */}
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
      </nav>
    </header>
  );
};