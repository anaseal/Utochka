/* FILE: src\components\Editor\CanvasView\CrossWeaveCanvasView.tsx */
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { CrossWeaveBead } from '../../../types/crossWeaveBead';
import { CrossWeaveBeadView } from '../BeadView/CrossWeaveBeadView';
import { CrossWeaveRulers } from '../CanvasRulers/CrossWeaveRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { CROSS_WEAVE_THEME, defaultColorForCrossWeave } from '../../../config/crossWeaveTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng, type ContentBounds } from '../../../utils/exportScheme';
import { mirrorCrossWeaveBeadId } from '../../../utils/crossWeaveMirror';
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
  mirrorMode: boolean;
  rawWidth: number;
}

// CrossWeave — MVP-канвас: карандаш/ластик + Mirror Mode, без stamp/flood-fill/подвесок.
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
  mirrorMode,
  rawWidth,
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

  // Границы для обрезки PNG по узору при экспорте (координаты корневого
  // <svg>, с учётом translate(offsetX, offsetY)) — впритык к закрашенным
  // бусинам со всех сторон. getBBox() всего клона тут не годится: линейка
  // и легенда из экспорта убираются целиком (см. handleExport), но даже без
  // них считать границы явно надёжнее и дешевле, чем гонять DOM-измерение.
  const paintedBounds = useMemo<ContentBounds | null>(() => {
    const painted = beads.filter((b) => !!designMap[b.id]);
    if (painted.length === 0) return null;
    const xs = painted.map((b) => b.x);
    const ys = painted.map((b) => b.y);
    const minX = offsetX + Math.min(...xs) - beadMajorRadius;
    const minY = offsetY + Math.min(...ys) - beadMajorRadius;
    return {
      x: minX,
      y: minY,
      width: offsetX + Math.max(...xs) + beadMajorRadius - minX,
      height: offsetY + Math.max(...ys) + beadMajorRadius - minY,
    };
  }, [beads, designMap, beadMajorRadius]);

  const mirrorAxis = useMemo(() => {
    if (!mirrorMode || beads.length === 0) return null;
    let maxX = 0;
    let found = false;
    for (const b of beads) {
      if (b.orientation === 'horizontal' && b.x > maxX) { maxX = b.x; found = true; }
    }
    if (!found) return null;
    const ys = beads.map(b => b.y);
    const axisMarginY = 30;
    return {
      x: maxX / 2,
      yTop: Math.min(...ys) - axisMarginY,
      yBottom: Math.max(...ys) + axisMarginY,
    };
  }, [mirrorMode, beads]);

  const applyPaint = useCallback((id: string) => {
    paintBead(id);
    if (mirrorMode) {
      const m = mirrorCrossWeaveBeadId(id, rawWidth);
      if (m !== null && m !== id) paintBead(m);
    }
  }, [paintBead, mirrorMode, rawWidth]);

  const handleMouseEnter = useCallback((id: string) => {
    if (isDrawing) applyPaint(id);
  }, [isDrawing, applyPaint]);

  const handleMouseDown = useCallback((id: string) => {
    applyPaint(id);
  }, [applyPaint]);

  const handleExport = useCallback(() => {
    const svg = canvasSvgRef.current;
    if (!svg) return;
    exportSchemeToPng(svg, colorStats, totalCount, canvasTheme, {
      contentBounds: paintedBounds ?? undefined,
      // Незакрашенные бусины прячем только когда есть что показать —
      // на пустом холсте оставляем обычный вид всей сетки.
      extraStripSelector: paintedBounds
        ? '.bead--empty, .canvas__ruler-group'
        : '.canvas__ruler-group',
      hideLegend: true,
    }).catch((err) => {
      console.error('Failed to export scheme:', err);
    });
  }, [colorStats, totalCount, canvasTheme, paintedBounds]);

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

              {mirrorAxis && (
                <line
                  x1={mirrorAxis.x}
                  y1={mirrorAxis.yTop}
                  x2={mirrorAxis.x}
                  y2={mirrorAxis.yBottom}
                  className="canvas__mirror-axis"
                  pointerEvents="none"
                />
              )}

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
