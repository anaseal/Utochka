import './Header.css';

interface HeaderProps {
  palette: string[];
  activeColor: string;
  setActiveColor: (color: string) => void;
}

export const Header = ({ palette, activeColor, setActiveColor }: HeaderProps) => {
  return (
    <header className="header">
      <nav className="palette" aria-label="Color Palette">
        {palette.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`palette__color ${activeColor === color ? 'palette__color--active' : ''}`}
            style={{ '--color-value': color } as React.CSSProperties}
            aria-label={`Select color ${color}`}
            aria-pressed={activeColor === color}
          />
        ))}
      </nav>
    </header>
  );
};