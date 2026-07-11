/* FILE: src\components\Editor\CanvasView\KrestikCanvasView.tsx */
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { KrestikBead } from '../../../types/krestikBead';
import { KrestikBeadView } from '../BeadView/KrestikBeadView';
import { KrestikRulers } from '../CanvasRulers/KrestikRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { KRESTIK_THEME, defaultColorForKrestik } from '../../../config/krestikTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng } from '../../../utils/exportScheme';
import { Sun, Moon } from 'lucide-react';
import './CanvasView.css';

interface KrestikCanvasViewProps {
  beads: KrestikBead[];
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

// Крестик — MVP-канвас: только карандаш/ластик, без mirror/stamp/flood-fill/подвесок.
// Не ветка CanvasView, а отдельный компонент — переиспользует общий CSS-шелл
// (canvas__svg, editor__viewport, export-btn, canvas-theme-toggle) и CanvasStats.
export const KrestikCanvasView = ({
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
}: KrestikCanvasViewProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);

  const offsetX = 60;
  const offsetY = 60;
  const { beadMajorRadius } = KRESTIK_THEME.sizes;

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
      const color = designMap[bead.id] || defaultColorForKrestik();
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
              <KrestikRulers beads={beads} width={width} height={height} />

              {beads.map((bead) => (
                <KrestikBeadView
                  key={bead.id}
                  id={bead.id}
                  x={bead.x}
                  y={bead.y}
                  orientation={bead.orientation}
                  color={designMap[bead.id]}
                  defaultColor={defaultColorForKrestik()}
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
        title={canvasTheme === 'dark' ? 'Светлый холст' : 'Тёмный холст'}
        aria-label={canvasTheme === 'dark' ? 'Переключить на светлый холст' : 'Переключить на тёмный холст'}
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
