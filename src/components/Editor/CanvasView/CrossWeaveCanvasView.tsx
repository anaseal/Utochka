/* FILE: src\components\Editor\CanvasView\CrossWeaveCanvasView.tsx */
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { CrossWeaveBead } from '../../../types/crossWeaveBead';
import { CrossWeaveBeadView } from '../BeadView/CrossWeaveBeadView';
import { CrossWeaveRulers } from '../CanvasRulers/CrossWeaveRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { CROSS_WEAVE_THEME, defaultColorForCrossWeave } from '../../../config/crossWeaveTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng } from '../../../utils/exportScheme';
import { Sun, Moon } from 'lucide-react';
import './CanvasView.css';

interface CrossWeaveCanvasViewProps {
  beads: CrossWeaveBead[];
  width: number;
  height: number;
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  designMap: Record<string, string>;
  activeTool: DrawingTool;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
}

// CrossWeave — MVP-канвас: только карандаш/ластик, без mirror/stamp/flood-fill/подвесок.
// Не ветка CanvasView, а отдельный компонент — переиспользует общий CSS-шелл
// (canvas__svg, editor__viewport, export-btn, canvas-theme-toggle) и CanvasStats.
export const CrossWeaveCanvasView = ({
  beads,
  width,
  height,
  canvasTheme,
  onToggleCanvasTheme,
  designMap,
  activeTool,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  zoom,
  onZoomChange,
}: CrossWeaveCanvasViewProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);

  const offsetX = 60;
  const offsetY = 60;
  const { beadMajorRadius } = CROSS_WEAVE_THEME.sizes;

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        onZoomChange(-e.deltaY * 0.005);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onZoomChange]);

  const dim = useMemo(() => {
    if (beads.length === 0) return { w: 100, h: 100 };
    const maxX = Math.max(...beads.map(b => b.x));
    const maxY = Math.max(...beads.map(b => b.y));
    const margin = 30;
    return {
      w: maxX + offsetX + beadMajorRadius + margin,
      h: maxY + offsetY + beadMajorRadius + margin,
    };
  }, [beads, beadMajorRadius]);

  const colorStats = useMemo(() => {
    const stats = new Map<string, number>();
    beads.forEach(bead => {
      const color = designMap[bead.id] || defaultColorForCrossWeave();
      stats.set(color, (stats.get(color) || 0) + 1);
    });
    return Array.from(stats.entries());
  }, [beads, designMap]);

  const totalCount = beads.length;

  const handleMouseEnter = useCallback((id: string) => {
    if (isDrawing) paintBead(id);
  }, [isDrawing, paintBead]);

  const handleMouseDown = useCallback((id: string) => {
    paintBead(id);
  }, [paintBead]);

  const handleExport = useCallback(() => {
    const svg = canvasSvgRef.current;
    if (!svg) return;
    exportSchemeToPng(svg, colorStats, totalCount, canvasTheme).catch((err) => {
      console.error('Failed to export scheme:', err);
    });
  }, [colorStats, totalCount, canvasTheme]);

  return (
    <main
      data-canvas-theme={canvasTheme}
      className="editor__viewport"
      onMouseDown={() => startDrawing()}
      onMouseUp={() => stopDrawing()}
      onMouseLeave={() => stopDrawing()}
      onDragStart={(e) => e.preventDefault()}
    >
      <section className="canvas">
        <div
          className="canvas__svg"
          data-canvas-theme={canvasTheme}
          ref={canvasContainerRef}
        >
          <svg
            ref={canvasSvgRef}
            width={dim.w * zoom}
            height={dim.h * zoom}
            viewBox={`0 0 ${dim.w} ${dim.h}`}
            className="canvas__svg-content"
          >
            <g transform={`translate(${offsetX}, ${offsetY})`}>
              <CrossWeaveRulers beads={beads} width={width} height={height} />

              {beads.map((bead) => (
                <CrossWeaveBeadView
                  key={bead.id}
                  id={bead.id}
                  x={bead.x}
                  y={bead.y}
                  orientation={bead.orientation}
                  color={designMap[bead.id]}
                  defaultColor={defaultColorForCrossWeave()}
                  onMouseEnter={handleMouseEnter}
                  onMouseDown={handleMouseDown}
                />
              ))}
            </g>
          </svg>
        </div>
      </section>

      <CanvasStats totalCount={totalCount} colorStats={colorStats} />

      <button
        type="button"
        className="canvas-theme-toggle"
        onClick={onToggleCanvasTheme}
        onMouseDown={(e) => e.stopPropagation()}
        title={canvasTheme === 'dark' ? 'Light canvas' : 'Dark canvas'}
        aria-label={canvasTheme === 'dark' ? 'Switch to light canvas' : 'Switch to dark canvas'}
      >
        {canvasTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <button
        type="button"
        className="export-btn"
        onClick={handleExport}
        onMouseDown={(e) => e.stopPropagation()}
      >
        Download PNG
      </button>
    </main>
  );
};
