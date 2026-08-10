/* FILE: src\components\Editor\CanvasView\LoomCanvasView.tsx */
import { useMemo, useCallback, useRef } from 'react';
import { LoomBead } from '../../../types/loomBead';
import { LoomStampPattern } from '../../../utils/loomStamp';
import { LoomBeadView } from '../BeadView/LoomBeadView';
import { LoomRulers } from '../CanvasRulers/LoomRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { CanvasChrome } from './CanvasChrome';
import { CanvasScrollbars } from './CanvasScrollbars';
import { CanvasSurface } from './CanvasSurface';
import { WeaveTool } from '../Header/WeaveControls';
import { CanvasOrientation } from '../Header/Header.types';
import { WeaveLayer } from '../WeaveLayer/WeaveLayer';
import { loomRowSegment } from '../../../utils/weaveSegment';
import { WeaveProgressControls } from '../../../hooks/useWeaveProgress';
import { useWeaveCanvas } from '../../../hooks/useWeaveCanvas';
import { useCanvasView } from '../../../hooks/useCanvasView';
import { defaultColorForLoom, pitchYFromX } from '../../../config/loomTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng, type ContentBounds } from '../../../utils/exportScheme';
import type { ShowToast } from '../../../hooks/useToast';
import { mirrorLoomBeadId } from '../../../utils/loomMirror';
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

interface LoomCanvasViewProps {
  beads: LoomBead[];
  width: number;
  height: number;
  // Реальный шаг сетки по X — вместе с pitchYFromX(pitchX) задаёт РОВНЫЙ
  // размер прямоугольной бисерины (см. LoomBeadView.tsx): без зазора и без
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
  stampPattern: LoomStampPattern | null;
  stampPreviewPatch: Record<string, string> | null;
  onStampSelect: (ids: string[]) => void;
  onStampHover: (nodeId: string | null) => void;
  onStampPlace: (nodeId: string) => void;
  // Вид полотна (поворот/отражение) — общий для рисования и режима плетения
  // (см. useCanvasView.ts, spec.md «Поворот и отражение полотна»).
  orientation: CanvasOrientation;
  flipped: boolean;
  // Режим плетения — тот же, что у силянки/crossWeave (см. spec.md, «Режим
  // плетения»). Сегмент здесь — целый ряд (один проход утка).
  weaveMode: boolean;
  weaveTool: WeaveTool;
  weave: WeaveProgressControls;
  weaveShowLast: boolean;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: null,
  ) => void;
  // Отказ экспорта PNG нечем показать на самом холсте — уходит тостом
  // (варианта error), иначе кнопка «Download PNG» молчит и файла нет.
  showToast: ShowToast;
}

const OFFSET_X = 60;
const OFFSET_Y = 60;

// Loom — MVP-канвас: карандаш/ластик/заливка/штамп + Mirror Mode + режим
// плетения (сегмент — ряд, см. spec.md, «Loom»). Не ветка CanvasView/
// PeyoteCanvasView/CrossWeaveCanvasView, а отдельный компонент — своя
// геометрия (прямоугольная бисерина, прямая сетка без сдвига рядов), но общие
// механики холста (режим плетения, подсветка цвета, штамп, оболочка) те же
// хуки, что у остальных техник.
export const LoomCanvasView = ({
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
  orientation,
  flipped,
  weaveMode,
  weaveTool,
  weave,
  weaveShowLast,
  applyPatch,
  showToast,
}: LoomCanvasViewProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);
  const canvasGroupRef = useRef<SVGGElement>(null);
  // Размер прямоугольника бисерины — ровно шаг сетки (см. комментарий у
  // pitchX в пропах выше и в config/loomTheme.ts).
  const beadWidth = pitchX;
  const beadHeight = pitchYFromX(pitchX);
  const beadMargin = Math.max(beadWidth, beadHeight) / 2;

  const dim = useMemo(
    () => computeCanvasDim(beads, OFFSET_X, OFFSET_Y, beadMargin),
    [beads, beadMargin],
  );

  // Второй палец отменяет начатый одним пальцем жест (мазок/драг штампа/мазок
  // отметок) — переключение на панораму/zoom. Поздняя привязка через ref —
  // та же причина, что в PeyoteCanvasView.tsx/CrossWeaveCanvasView.tsx.
  const cancelActiveStrokeRef = useRef<() => void>(() => {});
  const cancelActiveStroke = useCallback(() => cancelActiveStrokeRef.current(), []);
  // При горизонтальной ориентации <svg> получает width/height от
  // canvasView.viewW/viewH (rotated меняет местами w/h), а не от dim
  // напрямую — см. тот же комментарий в CrossWeaveCanvasView.tsx.
  const canvasView = useCanvasView({ orientation, flipped, dim });
  const touchDim = { w: canvasView.viewW, h: canvasView.viewH };
  useWheelZoom(canvasContainerRef, canvasSvgRef, zoom, touchDim, onZoomChange);
  const touchGesture = useTouchPanZoom(canvasContainerRef, canvasSvgRef, zoom, touchDim, onSetZoom, cancelActiveStroke);
  const { statsRef, reserve: statsReserve } = useStatsReserve(140);

  const toBeadCoords = useBeadCoords(canvasGroupRef, canvasSvgRef);

  const stamp = useStampTool({
    active: !weaveMode && activeTool === 'stamp',
    beads,
    toBeadCoords,
    stampPattern,
    onStampHover,
    onStampSelect,
    onStampPlace,
    isMultiTouch: touchGesture.isMultiTouch,
  });

  // --- Режим плетения -------------------------------------------------------
  // Сегмент Loom — целый ряд: один проход утка набирает и протягивает ряд
  // бисерин целиком (см. utils/weaveSegment.ts, loomRowSegment). В отличие от
  // crossWeaveCellOf, ряды физически не пересекаются — фильтровать уже
  // отмеченные не нужно, повторный клик по ряду — это честный повторный
  // проход (см. комментарий в useWeaveCanvas.ts про накопление проходов).
  const resolveStrokeIds = useCallback((beadId: string) => {
    if (weaveTool !== 'segment') return [beadId];
    return loomRowSegment(beadId, width) ?? [beadId];
  }, [weaveTool, width]);

  // Больший из двух полуразмеров — бисерина прямоугольная (уже, чем выше), и
  // рамка последнего сегмента (WeaveLayer) должна охватывать её целиком, а не
  // только по узкой стороне.
  const radiusOf = useCallback(() => beadMargin, [beadMargin]);

  const weaveCanvas = useWeaveCanvas({
    svgRef: canvasSvgRef,
    beads,
    weave,
    active: weaveMode,
    tool: weaveTool,
    radiusOf,
    resolveStrokeIds,
  });

  cancelActiveStrokeRef.current = () => {
    stopDrawing();
    stamp.cancel();
    // Второй палец обрывает и уже идущий мазок отметок (режим плетения) —
    // без этого weaveCanvas.drawingRef оставался бы true во время всего
    // пинч/панорама-жеста. endStroke() — no-op, если мазок и так не шёл.
    weaveCanvas.endStroke();
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
    defaultColorOf: defaultColorForLoom,
    onReplaceColor: replaceColor,
  });

  const totalCount = beads.length;

  // Границы для обрезки PNG по узору при экспорте — тот же приём, что и в
  // PeyoteCanvasView.tsx/CrossWeaveCanvasView.tsx.
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
    (id: string) => mirrorLoomBeadId(id, width),
    [width],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);
  const applyPaintFast = useFastPaint({
    canvasSvgRef, paintBeadFast, mirrorMode, mirrorFn, defaultColorOf: defaultColorForLoom,
  });

  const handlePointerEnter = useCallback((id: string) => {
    if (weaveMode) {
      weaveCanvas.touchWhileDrawing(id);
      return;
    }
    if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && isDrawing) applyPaintFast(id);
  }, [weaveMode, weaveCanvas, activeTool, isDrawing, applyPaintFast]);

  const handlePointerDown = useCallback((id: string) => {
    if (weaveMode) {
      weaveCanvas.touch(id);
      return;
    }
    if (activeTool === 'stamp') return;
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [weaveMode, weaveCanvas, activeTool, applyPaint, onFloodFill]);

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
      showToast('Export failed', 'error');
    });
  }, [colorStats, totalCount, canvasTheme, paintedBounds, showToast]);

  return (
    <CanvasSurface
      canvasTheme={canvasTheme}
      activeTool={activeTool}
      weaveMode={weaveMode}
      statsReserve={statsReserve}
      touchGesture={touchGesture}
      startDrawing={startDrawing}
      stopDrawing={stopDrawing}
      onWeaveStrokeStart={weaveCanvas.beginStroke}
      onWeaveStrokeEnd={weaveCanvas.endStroke}
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
              width={canvasView.viewW * zoom}
              height={canvasView.viewH * zoom}
              viewBox={`0 0 ${canvasView.viewW} ${canvasView.viewH}`}
              className="canvas__svg-content"
            >
              <g transform={canvasView.transform}>
              <g ref={canvasGroupRef} transform={`translate(${OFFSET_X}, ${OFFSET_Y})`}>
                <LoomRulers beads={beads} width={width} height={height} labelTransform={canvasView.labelTransform} />

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
                  <LoomBeadView
                    key={bead.id}
                    id={bead.id}
                    x={bead.x}
                    y={bead.y}
                    beadWidth={beadWidth}
                    beadHeight={beadHeight}
                    color={designMap[bead.id]}
                    defaultColor={defaultColorForLoom()}
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

                <WeaveLayer
                  positions={weaveCanvas.positions}
                  lastSegment={weave.lastSegment}
                  active={weaveMode}
                  showLast={weaveShowLast}
                />
              </g>
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
        showExport={!weaveMode}
      />
    </CanvasSurface>
  );
};
