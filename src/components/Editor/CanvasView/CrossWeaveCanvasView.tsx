/* FILE: src\components\Editor\CanvasView\CrossWeaveCanvasView.tsx */
import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { CrossWeaveBead } from '../../../types/crossWeaveBead';
import { CrossWeaveBeadView } from '../BeadView/CrossWeaveBeadView';
import { CrossWeaveRulers } from '../CanvasRulers/CrossWeaveRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { CanvasChrome } from './CanvasChrome';
import { CROSS_WEAVE_THEME, defaultColorForCrossWeave } from '../../../config/crossWeaveTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng, type ContentBounds } from '../../../utils/exportScheme';
import { mirrorCrossWeaveBeadId } from '../../../utils/crossWeaveMirror';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { computeCanvasDim } from '../../../utils/canvasDim';
import { computeColorStats } from '../../../utils/colorStats';
import { swapColorInMap } from '../../../utils/colorSwap';
import './CanvasView.css';

interface CrossWeaveCanvasViewProps {
  beads: CrossWeaveBead[];
  width: number;
  height: number;
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  designMap: Record<string, string>;
  activeTool: DrawingTool;
  activeColor: string;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  mirrorMode: boolean;
  rawWidth: number;
  onFloodFill: (id: string) => void;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: null,
  ) => void;
}

// CrossWeave — MVP-канвас: карандаш/ластик/заливка + Mirror Mode, без stamp/подвесок.
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
  activeColor,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  zoom,
  onZoomChange,
  mirrorMode,
  rawWidth,
  onFloodFill,
  applyPatch,
}: CrossWeaveCanvasViewProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);
  const [highlightedColor, setHighlightedColor] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedColor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHighlightedColor(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [highlightedColor]);

  const handleToggleHighlight = useCallback((color: string) => {
    setHighlightedColor((c) => (c === color ? null : color));
  }, []);

  const handleReplaceColor = useCallback((oldColor: string) => {
    applyPatch((m) => swapColorInMap(m, oldColor, activeColor), null);
    setHighlightedColor((c) => (c === oldColor ? null : c));
  }, [applyPatch, activeColor]);

  const offsetX = 60;
  const offsetY = 60;
  const { beadMajorRadius } = CROSS_WEAVE_THEME.sizes;

  useWheelZoom(canvasContainerRef, onZoomChange);
  const touchGesture = useTouchPanZoom(canvasContainerRef, zoom, onZoomChange, stopDrawing);
  const { statsRef, reserve: statsReserve } = useStatsReserve(140);

  const dim = useMemo(
    () => computeCanvasDim(beads, offsetX, offsetY, beadMajorRadius),
    [beads, beadMajorRadius],
  );

  const colorStats = useMemo(
    () => Array.from(computeColorStats(beads, designMap, defaultColorForCrossWeave).entries()),
    [beads, designMap],
  );

  const totalCount = beads.length;

  const colorHighlightedBeadIds = useMemo(() => {
    if (!highlightedColor) return null;
    const ids = new Set<string>();
    beads.forEach((b) => {
      const effective = designMap[b.id] || defaultColorForCrossWeave();
      if (effective === highlightedColor) ids.add(b.id);
    });
    return ids;
  }, [highlightedColor, beads, designMap]);

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

  const mirrorFn = useCallback(
    (id: string) => mirrorCrossWeaveBeadId(id, rawWidth),
    [rawWidth],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);

  const handlePointerEnter = useCallback((id: string) => {
    if (activeTool !== 'flood-fill' && isDrawing) applyPaint(id);
  }, [activeTool, isDrawing, applyPaint]);

  const handlePointerDown = useCallback((id: string) => {
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [activeTool, applyPaint, onFloodFill]);

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
      className={`editor__viewport${activeTool === 'flood-fill' ? ' editor__viewport--flood-fill' : ''}`}
      style={{ '--stats-reserve': `${statsReserve}px` } as React.CSSProperties}
      onPointerDownCapture={touchGesture.onPointerDownCapture}
      onPointerMove={touchGesture.onPointerMove}
      onPointerDown={() => { if (activeTool !== 'flood-fill') startDrawing(); }}
      onPointerUp={(e) => { touchGesture.releasePointer(e); if (activeTool !== 'flood-fill') stopDrawing(); }}
      onPointerCancel={(e) => { touchGesture.releasePointer(e); if (activeTool !== 'flood-fill') stopDrawing(); }}
      onPointerLeave={(e) => { touchGesture.releasePointer(e); if (activeTool !== 'flood-fill') stopDrawing(); }}
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
                  highlighted={colorHighlightedBeadIds?.has(bead.id) ?? false}
                  onPointerEnter={handlePointerEnter}
                  onPointerDown={handlePointerDown}
                />
              ))}
            </g>
          </svg>
        </div>
      </section>

      <CanvasStats
        ref={statsRef}
        totalCount={totalCount}
        colorStats={colorStats}
        highlightedColor={highlightedColor}
        onToggleHighlight={handleToggleHighlight}
        activeColor={activeColor}
        onReplaceColor={handleReplaceColor}
      />

      <CanvasChrome
        canvasTheme={canvasTheme}
        onToggleCanvasTheme={onToggleCanvasTheme}
        onExport={handleExport}
      />
    </main>
  );
};
