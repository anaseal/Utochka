/* FILE: src\components\Editor\CanvasView\CanvasView.tsx */
import { useMemo, useCallback } from 'react';
import { Bead } from '../../../types/bead';
import { PendantPlacement, PendantTemplate } from '../../../types/pendant';
import { PENDANT_SCALE } from '../../../data/pendantTemplates';
import { BeadView } from '../BeadView/BeadView';
import { CanvasRulers } from '../CanvasRulers/CanvasRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { PendantLayer } from '../PendantLayer/PendantLayer';
import { BEAD_THEME, defaultColorFor } from '../../../config/theme';
import { mirrorBeadId } from '../../../utils/mirror';
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
  decorBands: Record<number, number>;
  onDecorChange: (nodeRow: number, delta: number) => void;
  mirrorMode: boolean;
  width: number;
  internalTop: number;
  pendantPlacements: PendantPlacement[];
  pendantTemplates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  hoveredCol: number | null;
  onPaintPendantBead: (placementId: string, beadIndex: number) => void;
  onRemovePlacement: (placementId: string) => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
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
  decorBands,
  onDecorChange,
  mirrorMode,
  width,
  internalTop,
  pendantPlacements,
  pendantTemplates,
  bottomNodes,
  hoveredCol,
  onPaintPendantBead,
  onRemovePlacement,
  canvasSvgRef,
}: CanvasViewProps) => {

  const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
  const { nodeRadius } = BEAD_THEME.sizes;

  const dim = useMemo(() => {
    if (beads.length === 0) return { w: 100, h: 100 };
    const maxX = Math.max(...beads.map(b => b.x));
    const maxY = Math.max(...beads.map(b => b.y));

    // Подвески свисают ниже сетки — учитываем их глубину в высоте SVG.
    let pendantMaxY = 0;
    for (const p of pendantPlacements) {
      const t = pendantTemplates[p.templateId];
      const anchor = bottomNodes.find(n => n.logicalIndex.col === p.col);
      if (!t || !anchor) continue;
      const depth = Math.max(...t.beads.map(b =>
        b.dy + (b.shape === 'circle' ? (b.r ?? 0) : (b.h ?? 0) / 2),
      ));
      // +26: место под кнопку удаления ниже последней бусины
      pendantMaxY = Math.max(pendantMaxY, anchor.y + depth * PENDANT_SCALE + 26);
    }

    const margin = 30;
    // Справа от полотна CanvasRulers рисует декор-контролы — резервируем место.
    const decorCtrlMargin = 80;
    return {
      w: maxX + offsetX + nodeRadius + margin + decorCtrlMargin,
      h: Math.max(maxY, pendantMaxY) + offsetY + nodeRadius + margin,
    };
  }, [beads, offsetX, offsetY, nodeRadius, pendantPlacements, pendantTemplates, bottomNodes]);

  const colorStats = useMemo(() => {
    const stats = new Map<string, number>();
    beads.forEach(bead => {
      const color = designMap[bead.id] || defaultColorFor(bead.type);
      stats.set(color, (stats.get(color) || 0) + 1);
    });
    return Array.from(stats.entries());
  }, [beads, designMap]);

  const applyPaint = useCallback((id: string) => {
    paintBead(id);
    if (mirrorMode) {
      const m = mirrorBeadId(id, width, internalTop);
      if (m !== null && m !== id) paintBead(m);
    }
  }, [paintBead, mirrorMode, width, internalTop]);

  const handleMouseEnter = useCallback((id: string) => {
    if (isDrawing) applyPaint(id);
  }, [isDrawing, applyPaint]);

  const handleMouseDown = useCallback((id: string) => {
    applyPaint(id);
  }, [applyPaint]);

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
            ref={canvasSvgRef}
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
                decorBands={decorBands}
                onDecorChange={onDecorChange}
                mirrorMode={mirrorMode}
                width={width}
              />

              {beads.map((bead) => (
                <BeadView
                  key={bead.id}
                  id={bead.id}
                  x={bead.x}
                  y={bead.y}
                  type={bead.type}
                  color={designMap[bead.id]}
                  defaultColor={defaultColorFor(bead.type)}
                  onMouseEnter={handleMouseEnter}
                  onMouseDown={handleMouseDown}
                />
              ))}

              <PendantLayer
                placements={pendantPlacements}
                templates={pendantTemplates}
                bottomNodes={bottomNodes}
                isDrawing={isDrawing}
                onPaintBead={onPaintPendantBead}
                onRemove={onRemovePlacement}
                hoveredCol={hoveredCol}
                mirrorMode={mirrorMode}
                width={width}
              />
            </g>
          </svg>
        </div>
      </section>

      <CanvasStats totalCount={beads.length} colorStats={colorStats} />
    </main>
  );
};