/* FILE: src\components\Editor\CanvasView\PeyoteCanvasView.tsx */
import { useMemo, useCallback, useRef } from 'react';
import { PeyoteBead } from '../../../types/peyoteBead';
import { PeyoteStampPattern } from '../../../utils/peyoteStamp';
import { PeyoteBeadView } from '../BeadView/PeyoteBeadView';
import { PeyoteRulers } from '../CanvasRulers/PeyoteRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { CanvasChrome } from './CanvasChrome';
import { CanvasScrollbars } from './CanvasScrollbars';
import { CanvasSurface } from './CanvasSurface';
import { defaultColorForPeyote, pitchYFromX } from '../../../config/peyoteTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng, type ContentBounds } from '../../../utils/exportScheme';
import { mirrorPeyoteBeadId } from '../../../utils/peyoteMirror';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { useFastPaint } from '../../../hooks/useFastPaint';
import { useBeadCoords } from '../../../hooks/useBeadCoords';
import { useColorHighlight } from '../../../hooks/useColorHighlight';
import { useStampTool } from '../../../hooks/useStampTool';
import { computeCanvasDim } from '../../../utils/canvasDim';
import { swapColorInMap } from '../../../utils/colorSwap';
import './CanvasView.css';

interface PeyoteCanvasViewProps {
  beads: PeyoteBead[];
  width: number;
  height: number;
  // Реальный шаг сетки по X — вместе с pitchYFromX(pitchX) задаёт РОВНЫЙ
  // размер прямоугольной бисерины (см. PeyoteBeadView.tsx): без зазора и без
  // наезда друг на друга при любом Spacing, не только при дефолтном.
  pitchX: number;
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  designMap: Record<string, string>;
  activeTool: DrawingTool;
  activeColor: string;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  paintBeadFast: (id: string) => string | undefined;
  startDrawing: () => void;
  stopDrawing: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom: (v: number) => void;
  mirrorMode: boolean;
  onFloodFill: (id: string) => void;
  stampPattern: PeyoteStampPattern | null;
  stampPreviewPatch: Record<string, string> | null;
  onStampSelect: (ids: string[]) => void;
  onStampHover: (nodeId: string | null) => void;
  onStampPlace: (nodeId: string) => void;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: null,
  ) => void;
}

const OFFSET_X = 60;
const OFFSET_Y = 60;

// Peyote — MVP-канвас: карандаш/ластик/заливка/штамп + Mirror Mode. Без
// подвесок/ниток/режима плетения (см. spec.md, «Peyote») — не ветка
// CanvasView/CrossWeaveCanvasView, а отдельный компонент: своя геометрия
// (прямоугольная бисерина, зубчатая кирпичная кладка) и свой набор
// инструментов (штамп есть, в отличие от crossWeave; нитки и режима
// плетения нет, в отличие от обеих других техник).
export const PeyoteCanvasView = ({
  beads,
  width,
  height,
  pitchX,
  canvasTheme,
  onToggleCanvasTheme,
  designMap,
  activeTool,
  activeColor,
  isDrawing,
  paintBead,
  paintBeadFast,
  startDrawing,
  stopDrawing,
  zoom,
  onZoomChange,
  onSetZoom,
  mirrorMode,
  onFloodFill,
  stampPattern,
  stampPreviewPatch,
  onStampSelect,
  onStampHover,
  onStampPlace,
  applyPatch,
}: PeyoteCanvasViewProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);
  const canvasGroupRef = useRef<SVGGElement>(null);
  // Размер прямоугольника бисерины — ровно шаг сетки (см. комментарий у
  // pitchX в пропах выше и в config/peyoteTheme.ts).
  const beadWidth = pitchX;
  const beadHeight = pitchYFromX(pitchX);
  const beadMargin = Math.max(beadWidth, beadHeight) / 2;

  const dim = useMemo(
    () => computeCanvasDim(beads, OFFSET_X, OFFSET_Y, beadMargin),
    [beads, beadMargin],
  );

  // Второй палец отменяет начатый одним пальцем жест (мазок/драг штампа) —
  // переключение на панораму/zoom. Поздняя привязка через ref — та же
  // причина, что в CanvasView.tsx/CrossWeaveCanvasView.tsx: useStampTool
  // объявляется ниже и сам зависит от isMultiTouch из touchGesture.
  const cancelActiveStrokeRef = useRef<() => void>(() => {});
  const cancelActiveStroke = useCallback(() => cancelActiveStrokeRef.current(), []);
  useWheelZoom(canvasContainerRef, canvasSvgRef, zoom, dim, onZoomChange);
  const touchGesture = useTouchPanZoom(canvasContainerRef, canvasSvgRef, zoom, dim, onSetZoom, cancelActiveStroke);
  const { statsRef, reserve: statsReserve } = useStatsReserve(140);

  const toBeadCoords = useBeadCoords(canvasGroupRef, canvasSvgRef);

  const stamp = useStampTool({
    active: activeTool === 'stamp',
    beads,
    toBeadCoords,
    stampPattern,
    onStampHover,
    onStampSelect,
    onStampPlace,
    isMultiTouch: touchGesture.isMultiTouch,
  });

  cancelActiveStrokeRef.current = () => {
    stopDrawing();
    stamp.cancel();
  };

  const replaceColor = useCallback((oldColor: string) => {
    applyPatch((m) => swapColorInMap(m, oldColor, activeColor), null);
  }, [applyPatch, activeColor]);

  const {
    highlightedColor, highlightedBeadIds, colorStats, toggleHighlight, replaceColor: handleReplaceColor,
  } = useColorHighlight({
    beads,
    designMap,
    isDrawing,
    defaultColorOf: defaultColorForPeyote,
    onReplaceColor: replaceColor,
  });

  const totalCount = beads.length;

  // Границы для обрезки PNG по узору при экспорте — тот же приём, что и в
  // CrossWeaveCanvasView.tsx.
  const paintedBounds = useMemo<ContentBounds | null>(() => {
    const painted = beads.filter((b) => !!designMap[b.id]);
    if (painted.length === 0) return null;
    const xs = painted.map((b) => b.x);
    const ys = painted.map((b) => b.y);
    const minX = OFFSET_X + Math.min(...xs) - beadMargin;
    const minY = OFFSET_Y + Math.min(...ys) - beadMargin;
    return {
      x: minX,
      y: minY,
      width: OFFSET_X + Math.max(...xs) + beadMargin - minX,
      height: OFFSET_Y + Math.max(...ys) + beadMargin - minY,
    };
  }, [beads, designMap, beadMargin]);

  const mirrorAxis = useMemo(() => {
    if (!mirrorMode || beads.length === 0) return null;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const b of beads) {
      if (b.x > maxX) maxX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.y > maxY) maxY = b.y;
    }
    const axisMarginY = 30;
    return { x: maxX / 2, yTop: minY - axisMarginY, yBottom: maxY + axisMarginY };
  }, [mirrorMode, beads]);

  const mirrorFn = useCallback(
    (id: string) => mirrorPeyoteBeadId(id, width),
    [width],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);
  const applyPaintFast = useFastPaint({
    canvasSvgRef, paintBeadFast, mirrorMode, mirrorFn, defaultColorOf: defaultColorForPeyote,
  });

  const handlePointerEnter = useCallback((id: string) => {
    if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && isDrawing) applyPaintFast(id);
  }, [activeTool, isDrawing, applyPaintFast]);

  const handlePointerDown = useCallback((id: string) => {
    if (activeTool === 'stamp') return;
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
      extraStripSelector: paintedBounds
        ? '.bead--empty, .canvas__ruler-group'
        : '.canvas__ruler-group',
      hideLegend: true,
    }).catch((err) => {
      console.error('Failed to export scheme:', err);
    });
  }, [colorStats, totalCount, canvasTheme, paintedBounds]);

  return (
    <CanvasSurface
      canvasTheme={canvasTheme}
      activeTool={activeTool}
      weaveMode={false}
      statsReserve={statsReserve}
      touchGesture={touchGesture}
      startDrawing={startDrawing}
      stopDrawing={stopDrawing}
      onWeaveStrokeStart={() => {}}
      onWeaveStrokeEnd={() => {}}
      onCommitThreadTrace={() => {}}
    >
      <section className="canvas">
        <div className="canvas__svg-frame">
          <div
            className="canvas__svg"
            data-canvas-theme={canvasTheme}
            ref={canvasContainerRef}
            onPointerDown={stamp.handlePointerDown}
            onPointerMove={stamp.handlePointerMove}
            onPointerUp={stamp.handlePointerUp}
            onPointerLeave={stamp.handlePointerLeave}
          >
            <svg
              ref={canvasSvgRef}
              width={dim.w * zoom}
              height={dim.h * zoom}
              viewBox={`0 0 ${dim.w} ${dim.h}`}
              className="canvas__svg-content"
            >
              <g ref={canvasGroupRef} transform={`translate(${OFFSET_X}, ${OFFSET_Y})`}>
                <PeyoteRulers beads={beads} width={width} height={height} />

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
                  <PeyoteBeadView
                    key={bead.id}
                    id={bead.id}
                    x={bead.x}
                    y={bead.y}
                    beadWidth={beadWidth}
                    beadHeight={beadHeight}
                    color={designMap[bead.id]}
                    defaultColor={defaultColorForPeyote()}
                    highlighted={highlightedBeadIds?.has(bead.id) ?? false}
                    previewColor={stampPreviewPatch?.[bead.id]}
                    onPointerEnter={handlePointerEnter}
                    onPointerDown={handlePointerDown}
                  />
                ))}

                {stamp.selectionRect && (
                  <rect
                    className="canvas__stamp-rect"
                    x={stamp.selectionRect.x}
                    y={stamp.selectionRect.y}
                    width={stamp.selectionRect.w}
                    height={stamp.selectionRect.h}
                  />
                )}
              </g>
            </svg>
          </div>

          <CanvasScrollbars containerRef={canvasContainerRef} />
        </div>
      </section>

      <CanvasStats
        ref={statsRef}
        totalCount={totalCount}
        colorStats={colorStats}
        highlightedColor={highlightedColor}
        onToggleHighlight={toggleHighlight}
        activeColor={activeColor}
        onReplaceColor={handleReplaceColor}
      />

      <CanvasChrome
        canvasTheme={canvasTheme}
        onToggleCanvasTheme={onToggleCanvasTheme}
        onExport={handleExport}
        showExport
      />
    </CanvasSurface>
  );
};
