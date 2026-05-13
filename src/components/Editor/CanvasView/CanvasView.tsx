/* FILE: src\components\Editor\CanvasView\CanvasView.tsx */
import { useMemo, useCallback } from 'react';
import { Bead } from '../../../types/bead';
import { BeadView } from '../BeadView/BeadView';
import { CanvasRulers } from '../CanvasRulers/CanvasRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { BEAD_THEME } from '../../../config/theme';
import './CanvasView.css';

interface CanvasViewProps {
  beads: Bead[];
  designMap: Record<string, string>;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  zoom: number;
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  onRowSpanChange: (spanRowIndex: number, delta: number) => void;
}

export const CanvasView = ({
  beads,
  designMap,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  zoom,
  topSpan,
  bottomSpan,
  rowSpanOverrides,
  onRowSpanChange,
}: CanvasViewProps) => {
  
  const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
  const { nodeRadius } = BEAD_THEME.sizes;

  const dim = useMemo(() => {
    if (beads.length === 0) return { w: 100, h: 100 };
    const maxX = Math.max(...beads.map(b => b.x));
    const maxY = Math.max(...beads.map(b => b.y));
    const margin = 30;
    return {
      w: maxX + offsetX + nodeRadius + margin,
      h: maxY + offsetY + nodeRadius + margin,
    };
  }, [beads, offsetX, offsetY, nodeRadius]);

  const colorStats = useMemo(() => {
    const stats = new Map<string, number>();
    beads.forEach(bead => {
      const isNode = bead.type === 'NODE';
      const defaultColor = isNode ? BEAD_THEME.colors.nodeDefault : BEAD_THEME.colors.spanDefault;
      const color = designMap[bead.id] || defaultColor;
      stats.set(color, (stats.get(color) || 0) + 1);
    });
    return Array.from(stats.entries());
  }, [beads, designMap]);

  const handleMouseEnter = useCallback((id: string) => {
    if (isDrawing) paintBead(id);
  }, [isDrawing, paintBead]);

  const handleMouseDown = useCallback((id: string) => {
    paintBead(id);
  }, [paintBead]);

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
            {/* Группа трансформации: отделяем визуальный отступ от логики координат */}
            <g transform={`translate(${offsetX}, ${offsetY})`}>
              <CanvasRulers
                beads={beads}
                topSpan={topSpan}
                bottomSpan={bottomSpan}
                rowSpanOverrides={rowSpanOverrides}
                onRowSpanChange={onRowSpanChange}
              />

              {beads.map((bead) => (
                <BeadView
                  key={bead.id}
                  id={bead.id}
                  x={bead.x}
                  y={bead.y}
                  type={bead.type}
                  color={designMap[bead.id]}
                  defaultColor={bead.type === 'NODE' ? BEAD_THEME.colors.nodeDefault : BEAD_THEME.colors.spanDefault}
                  onMouseEnter={handleMouseEnter}
                  onMouseDown={handleMouseDown}
                />
              ))}
            </g>
          </svg>
        </div>
      </section>

      <CanvasStats totalCount={beads.length} colorStats={colorStats} />
    </main>
  );
};