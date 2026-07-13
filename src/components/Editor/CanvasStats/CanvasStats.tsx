import { Replace } from 'lucide-react';
import './CanvasStats.css';

const HEX_RE = /^#[0-9a-f]{6}$/i;

interface CanvasStatsProps {
  totalCount: number;
  colorStats: [string, number][];
  highlightedColor: string | null;
  onToggleHighlight: (color: string) => void;
  activeColor: string;
  onReplaceColor: (oldColor: string) => void;
}

export const CanvasStats = ({
  totalCount, colorStats, highlightedColor, onToggleHighlight, activeColor, onReplaceColor,
}: CanvasStatsProps) => {
  return (
    <aside className="stats">
      <article className="stats__total">
        <h3 className="stats__label">Total Count</h3>
        <p className="stats__value">{totalCount}</p>
      </article>

      <span className="stats__divider" aria-hidden="true" />

      <ul className="stats__list">
        {colorStats.map(([color, count]) => {
          const isReplaceable = HEX_RE.test(color);
          const isHighlighted = highlightedColor === color;
          const isActiveColor = isReplaceable && color.toLowerCase() === activeColor.toLowerCase();
          return (
            <li
              key={color}
              className={`stats__color-badge${isHighlighted ? ' stats__color-badge--active' : ''}`}
            >
              <button
                type="button"
                className="stats__indicator-btn"
                onClick={() => onToggleHighlight(color)}
                aria-pressed={isHighlighted}
                aria-label={`Подсветить бисерины цвета ${color}`}
                title="Подсветить на холсте"
              >
                <span className="stats__indicator" style={{ backgroundColor: color }} />
              </button>
              <span className="stats__count">{count}</span>
              {isReplaceable && (
                <button
                  type="button"
                  className="stats__replace-btn"
                  onClick={() => onReplaceColor(color)}
                  disabled={isActiveColor}
                  title={isActiveColor ? 'Это и есть текущий цвет' : `Заменить на текущий цвет (${activeColor})`}
                  aria-label={`Заменить цвет ${color} на текущий выбранный`}
                >
                  <Replace size={11} aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
