import './CanvasStats.css';

interface CanvasStatsProps {
  totalCount: number;
  colorStats: [string, number][];
}

export const CanvasStats = ({ totalCount, colorStats }: CanvasStatsProps) => {
  return (
    <aside className="stats">
      <article className="stats__total">
        <h3 className="stats__label">Total Count</h3>
        <p className="stats__value">{totalCount}</p>
      </article>

      <span className="stats__divider" aria-hidden="true" />

      <ul className="stats__list">
        {colorStats.map(([color, count]) => (
          <li key={color} className="stats__color-badge">
            <span className="stats__indicator" style={{ backgroundColor: color }} />
            <span className="stats__count">{count}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};
