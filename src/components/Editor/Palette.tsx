import './Palette.css';

interface PaletteProps {
  palette: string[];
  activeColor: string;
  setActiveColor: (color: string) => void;
}

export const Palette = ({ palette, activeColor, setActiveColor }: PaletteProps) => {
  return (
    <header className="palette">
      <nav className="palette__list" aria-label="Color Palette">
        <ul className="flex gap-3 list-none p-0 m-0">
          {palette.map((color) => (
            <li key={color}>
              <button
                onClick={() => setActiveColor(color)}
                className={`palette__color ${activeColor === color ? 'palette__color--active' : ''}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                aria-pressed={activeColor === color}
              />
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};