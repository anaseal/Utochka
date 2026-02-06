import './CanvasStats.css';

interface CanvasStatsProps {
  totalCount: number;
  colorStats: [string, number][];
}

export const CanvasStats = ({ totalCount, colorStats }: CanvasStatsProps) => {
  return (
    <>
      <aside className="stats stats--left">
        <article className="stats__item">
          <h3 className="stats__label">Total Count</h3>
          <p className="stats__value">{totalCount}</p>
        </article>
      </aside>

      <aside className="stats stats--right">
        <ul className="stats__list">
          {colorStats.map(([color, count]) => (
            <li key={color} className="stats__color-badge">
              <span className="stats__indicator" style={{ backgroundColor: color }} />
              <span className="stats__value text-xs">{count}</span>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
};