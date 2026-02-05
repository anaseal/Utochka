/* src/components/Editor/CanvasView.tsx */
import { useMemo } from 'react';
import { Bead } from '../../types/bead';
import { BeadView } from '../BeadView';
import './CanvasView.css';

interface CanvasViewProps {
  beads: Bead[];
  designMap: Map<string, string>;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  onAddRow: () => void;
  onAddCol: () => void;
}

export const CanvasView = ({
  beads,
  designMap,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  onAddRow,
  onAddCol
}: CanvasViewProps) => {
  
  const dim = useMemo(() => {
    if (beads.length === 0) return { w: 100, h: 100 };
    return {
      w: Math.max(...beads.map(b => b.x)) + 60,
      h: Math.max(...beads.map(b => b.y)) + 60
    };
  }, [beads]);

  const colorStats = useMemo(() => {
    const stats = new Map<string, number>();
    beads.forEach(bead => {
      const isNode = bead.type === 'NODE';
      const defaultColor = isNode ? '#22d3ee' : '#e879f9';
      const color = designMap.get(bead.id) || defaultColor;
      stats.set(color, (stats.get(color) || 0) + 1);
    });
    return Array.from(stats.entries());
  }, [beads, designMap]);

  // Фильтрация узлов для осей координат
  const xAxesNodes = useMemo(() => 
    beads.filter(b => b.type === 'NODE' && b.logicalIndex.row === 0), 
  [beads]);

  const yAxesNodes = useMemo(() => 
    beads.filter(b => b.type === 'NODE' && b.logicalIndex.col === 0), 
  [beads]);

  // Вычисление фиксированных базовых линий для выравнивания "в одну линию"
  const baselineY = useMemo(() => 
    xAxesNodes.length > 0 ? Math.min(...xAxesNodes.map(n => n.y)) - 30 : 20, 
  [xAxesNodes]);

  const baselineX = useMemo(() => 
    yAxesNodes.length > 0 ? Math.min(...yAxesNodes.map(n => n.x)) - 35 : 20, 
  [yAxesNodes]);

  return (
    <main 
      className="editor__viewport"
      onMouseDown={() => startDrawing()}
      onMouseUp={() => stopDrawing()}
      onMouseLeave={() => stopDrawing()}
      onDragStart={(e) => e.preventDefault()}
    >
      <section className="canvas">
        <div className="canvas__main-row">
          <div className="canvas__svg">
            <svg
              width={dim.w}
              height={dim.h}
              viewBox={`0 0 ${dim.w} ${dim.h}`}
              aria-label="Silyanka Design Canvas"
              className="canvas__svg-content"
            >
              {/* Горизонтальные индексы (Колонки) - Выровнены по baselineY */}
              <g className="canvas__ruler-group" aria-hidden="true">
                {xAxesNodes.map((node, i) => (
                  <text
                    key={`idx-x-${node.id}`}
                    x={node.x}
                    y={baselineY}
                    textAnchor="middle"
                    className="canvas__axis-text"
                  >
                    {i + 1}
                  </text>
                ))}
              </g>

              {/* Вертикальные индексы (Ряды) - Выровнены по baselineX */}
              <g className="canvas__ruler-group" aria-hidden="true">
                {yAxesNodes.map((node, i) => (
                  <text
                    key={`idx-y-${node.id}`}
                    x={baselineX}
                    y={node.y}
                    dominantBaseline="middle"
                    textAnchor="end"
                    className="canvas__axis-text"
                  >
                    {i + 1}
                  </text>
                ))}
              </g>

              {beads.map((bead) => (
                <BeadView
                  key={bead.id}
                  bead={{ ...bead, color: designMap.get(bead.id) }}
                  onMouseEnter={() => isDrawing && paintBead(bead.id)}
                  onMouseDown={() => paintBead(bead.id)}
                />
              ))}
            </svg>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onAddCol(); }}
            className="control-btn control-btn--col"
            aria-label="Add column"
          >
            <span className="text-xl mb-1" aria-hidden="true">+</span>
            <span className="control-btn__label control-btn__label--rotated">Col</span>
          </button>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAddRow(); }}
          className="control-btn control-btn--row"
          aria-label="Add row"
        >
          <span className="text-xl mr-3" aria-hidden="true">+</span>
          <span className="control-btn__label">Add Row</span>
        </button>
      </section>

      <aside className="stats stats--left">
        <article className="stats__item">
          <h3 className="stats__label">Total Count</h3>
          <p className="stats__value">{beads.length}</p>
        </article>
      </aside>

      <aside className="stats stats--right">
        <ul className="flex gap-3 list-none p-0 m-0">
          {colorStats.map(([color, count]) => (
            <li key={color} className="stats__color-badge">
              <span 
                className="stats__indicator" 
                style={{ backgroundColor: color }} 
                role="presentation"
              />
              <span className="stats__value text-xs">{count}</span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
};