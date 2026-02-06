import { useMemo } from 'react';
import { Bead } from '../../../types/bead';
import { BeadView } from '../BeadView/BeadView';
import { CanvasRulers } from '../CanvasRulers/CanvasRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import './CanvasView.css';

interface CanvasViewProps {
  beads: Bead[];
  designMap: Map<string, string>;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  zoom: number;
}

export const CanvasView = ({
  beads,
  designMap,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  zoom
}: CanvasViewProps) => {
  
  const dim = useMemo(() => {
    if (beads.length === 0) return { w: 100, h: 100 };
    return {
      w: Math.max(...beads.map(b => b.x)) + 150,
      h: Math.max(...beads.map(b => b.y)) + 150
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
        <div 
          className="canvas__svg" 
          style={{ '--canvas-zoom': zoom } as React.CSSProperties}
        >
          <svg
            width={dim.w}
            height={dim.h}
            viewBox={`0 0 ${dim.w} ${dim.h}`}
            className="canvas__svg-content"
          >
            <CanvasRulers beads={beads} />

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
      </section>

      <CanvasStats totalCount={beads.length} colorStats={colorStats} />
    </main>
  );
};