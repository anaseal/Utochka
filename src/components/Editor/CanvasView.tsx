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
              style={{ display: 'block' }}
            >
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