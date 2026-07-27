/* FILE: src\components\Editor\CanvasView\CrossWeaveCanvasView.tsx */
import { useMemo, useCallback, useRef } from 'react';
import { CrossWeaveBead } from '../../../types/crossWeaveBead';
import { Thread, ThreadCommitOptions } from '../../../types/thread';
import { CrossWeaveBeadView } from '../BeadView/CrossWeaveBeadView';
import { CrossWeaveRulers } from '../CanvasRulers/CrossWeaveRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { CanvasChrome } from './CanvasChrome';
import { CanvasSurface } from './CanvasSurface';
import { WeaveTool, WeaveOrientation } from '../Header/WeaveControls';
import { WeaveLayer } from '../WeaveLayer/WeaveLayer';
import { crossWeaveCellOf } from '../../../utils/weaveSegment';
import { WeaveProgressControls } from '../../../hooks/useWeaveProgress';
import { useWeaveCanvas } from '../../../hooks/useWeaveCanvas';
import { ThreadTraceControls } from './ThreadTraceControls';
import { ThreadLayer } from '../ThreadLayer/ThreadLayer';
import { CROSS_WEAVE_THEME, defaultColorForCrossWeave } from '../../../config/crossWeaveTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng, type ContentBounds } from '../../../utils/exportScheme';
import { mirrorCrossWeaveBeadId } from '../../../utils/crossWeaveMirror';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { useBeadCoords } from '../../../hooks/useBeadCoords';
import { useThreadTrace } from '../../../hooks/useThreadTrace';
import { useColorHighlight } from '../../../hooks/useColorHighlight';
import { computeCanvasDim } from '../../../utils/canvasDim';
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
  onSetZoom: (v: number) => void;
  mirrorMode: boolean;
  rawWidth: number;
  onFloodFill: (id: string) => void;
  threads: Thread[];
  onAddThread: (beadIds: string[], options?: ThreadCommitOptions) => void;
  onRerouteThreadEnd: (threadId: string, end: 'start' | 'end', traceBeadIds: string[]) => void;
  onRemoveThread: (id: string) => void;
  // Крестик физически плетётся двумя нитками одновременно — новая нитка
  // помечается текущим выбором (см. Header → ThreadMenu). У силянки такого
  // выбора нет (одна нитка), поэтому проп только здесь.
  activeThreadStrand: 1 | 2;
  // Режим плетения — тот же, что у силянки (см. spec.md, «Режим плетения»).
  // Сегмент здесь — ячейка-крестик из четырёх бисерин.
  weaveMode: boolean;
  weaveTool: WeaveTool;
  weaveOrientation: WeaveOrientation;
  weaveFlipped: boolean;
  weave: WeaveProgressControls;
  weaveShowLast: boolean;
  // «Кисть» ТЕКУЩЕЙ выбранной нити (activeThreadStrand) — своя пара на
  // каждую из двух ниток (см. useCrossWeaveProject.ts), сюда приходит уже
  // разрешённое под activeThreadStrand значение.
  activeThreadColor: string;
  activeThreadOpacity: number;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: null,
  ) => void;
}

const OFFSET_X = 60;
const OFFSET_Y = 60;

// CrossWeave — MVP-канвас: карандаш/ластик/заливка + Mirror Mode, без stamp/подвесок.
// Не ветка CanvasView, а отдельный компонент — общие механики (нитка, режим
// плетения, подсветка цвета, оболочка холста) вынесены в хуки и делятся с
// силянкой, здесь остаётся только своя геометрия и разметка.
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
  onSetZoom,
  mirrorMode,
  rawWidth,
  onFloodFill,
  threads,
  onAddThread,
  onRerouteThreadEnd,
  onRemoveThread,
  activeThreadStrand,
  activeThreadColor,
  activeThreadOpacity,
  applyPatch,
  weaveMode,
  weaveTool,
  weaveOrientation,
  weaveFlipped,
  weave,
  weaveShowLast,
}: CrossWeaveCanvasViewProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);
  const canvasGroupRef = useRef<SVGGElement>(null);
  const { beadMajorRadius } = CROSS_WEAVE_THEME.sizes;

  const dim = useMemo(
    () => computeCanvasDim(beads, OFFSET_X, OFFSET_Y, beadMajorRadius),
    [beads, beadMajorRadius],
  );

  useWheelZoom(canvasContainerRef, onZoomChange);

  // Второй палец отменяет начатый одним пальцем жест (мазок, трассировка
  // нитки) — переключение на панораму/zoom. Поздняя привязка через ref:
  // сброс трассировки живёт в useThreadTrace, а тому, в свою очередь, нужен
  // isMultiTouch отсюда — без ref эти два хука ссылались бы друг на друга.
  const cancelActiveStrokeRef = useRef<() => void>(() => {});
  const cancelActiveStroke = useCallback(() => cancelActiveStrokeRef.current(), []);
  const touchGesture = useTouchPanZoom(canvasContainerRef, canvasSvgRef, zoom, dim, onSetZoom, cancelActiveStroke);
  const { statsRef, reserve: statsReserve } = useStatsReserve(140);

  // Плоская карта id → координаты — у CrossWeave один слой бусин без
  // подвесок/цепочек (см. CanvasView.tsx/beadPositions.ts для силянки).
  const beadPositionIndex = useMemo(
    () => new Map(beads.map((b) => [b.id, { x: b.x, y: b.y }])),
    [beads],
  );

  const toBeadCoords = useBeadCoords(canvasGroupRef, canvasSvgRef);

  const thread = useThreadTrace({
    activeTool,
    threads,
    positionIndex: beadPositionIndex,
    hitboxRadius: CROSS_WEAVE_THEME.sizes.hitboxRadius,
    toBeadCoords,
    isMultiTouch: touchGesture.isMultiTouch,
    onAddThread,
    onRerouteThreadEnd,
    brushColor: activeThreadColor,
    brushOpacity: activeThreadOpacity,
    brushStrand: activeThreadStrand,
  });

  cancelActiveStrokeRef.current = () => {
    stopDrawing();
    thread.cancelHandleDrag();
    thread.cancel();
    // Второй палец обрывает и уже идущий мазок отметок (режим плетения) —
    // без этого weaveCanvas.drawingRef оставался true во время всего
    // пинч/панорама-жеста (см. тот же комментарий в CanvasView.tsx).
    // endStroke() — no-op, если мазок и так не шёл.
    weaveCanvas.endStroke();
  };

  // --- Режим плетения -------------------------------------------------------
  // Сегмент крестика — ячейка из четырёх бисерин; какая именно, определяется по
  // самой бисерине: она входит в две соседние ячейки, берётся та, которую она
  // замыкает — где она правая/нижняя (см. utils/weaveSegment.ts).
  const beadIdSet = useMemo(() => new Set(beads.map((b) => b.id)), [beads]);
  const resolveStrokeIds = useCallback((beadId: string, strokeSeen: ReadonlySet<string>) => {
    if (weaveTool !== 'segment') return [beadId];
    // Отметки текущего мазка ещё не в passes (коммит — в endStroke), но для
    // выбора ячейки они уже отмеченные: иначе протяжка возвращалась бы в
    // только что закрытый крестик.
    const cell = crossWeaveCellOf(
      beadId,
      beadIdSet,
      (id) => weave.passes[id] > 0 || strokeSeen.has(id),
    );
    // Полной ячейки нет ни с одной стороны (угол полотна) — там отмечается
    // только сама бисерина. Соседние крестики делят опорную бисерину, поэтому
    // сегмент отмечает только ещё не отмеченные: иначе стык выглядел бы
    // ложным «повторным проходом» (кратность — только инструментом
    // «Бисерина», см. CanvasView).
    return (cell ?? [beadId]).filter((id) => !(weave.passes[id] > 0));
  }, [weaveTool, beadIdSet, weave]);

  const radiusOf = useCallback(() => beadMajorRadius, [beadMajorRadius]);

  const weaveCanvas = useWeaveCanvas({
    svgRef: canvasSvgRef,
    beads,
    weave,
    active: weaveMode,
    tool: weaveTool,
    orientation: weaveOrientation,
    flipped: weaveFlipped,
    dim,
    radiusOf,
    resolveStrokeIds,
  });

  const replaceColor = useCallback((oldColor: string) => {
    applyPatch((m) => swapColorInMap(m, oldColor, activeColor), null);
  }, [applyPatch, activeColor]);

  const {
    highlightedColor, highlightedBeadIds, colorStats, toggleHighlight, replaceColor: handleReplaceColor,
  } = useColorHighlight({
    beads,
    designMap,
    isDrawing,
    defaultColorOf: defaultColorForCrossWeave,
    onReplaceColor: replaceColor,
  });

  const totalCount = beads.length;

  // Границы для обрезки PNG по узору при экспорте (координаты корневого
  // <svg>, с учётом translate(OFFSET_X, OFFSET_Y)) — впритык к закрашенным
  // бусинам со всех сторон. getBBox() всего клона тут не годится: линейка
  // и легенда из экспорта убираются целиком (см. handleExport), но даже без
  // них считать границы явно надёжнее и дешевле, чем гонять DOM-измерение.
  const paintedBounds = useMemo<ContentBounds | null>(() => {
    const painted = beads.filter((b) => !!designMap[b.id]);
    if (painted.length === 0) return null;
    const xs = painted.map((b) => b.x);
    const ys = painted.map((b) => b.y);
    const minX = OFFSET_X + Math.min(...xs) - beadMajorRadius;
    const minY = OFFSET_Y + Math.min(...ys) - beadMajorRadius;
    return {
      x: minX,
      y: minY,
      width: OFFSET_X + Math.max(...xs) + beadMajorRadius - minX,
      height: OFFSET_Y + Math.max(...ys) + beadMajorRadius - minY,
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

  // 'thread' сюда не заходит — точки добавляются только явным кликом
  // (handlePointerDown), протяжка их не добавляет.
  const handlePointerEnter = useCallback((id: string) => {
    if (weaveMode) {
      weaveCanvas.touchWhileDrawing(id);
      return;
    }
    if (activeTool !== 'flood-fill' && activeTool !== 'thread' && isDrawing) applyPaint(id);
  }, [weaveMode, weaveCanvas, activeTool, isDrawing, applyPaint]);

  const handlePointerDown = useCallback((id: string) => {
    if (weaveMode) {
      weaveCanvas.touch(id);
      return;
    }
    if (activeTool === 'thread') {
      thread.addPoint(id);
      return;
    }
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [weaveMode, weaveCanvas, activeTool, applyPaint, onFloodFill, thread]);

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
      onCommitThreadTrace={thread.commit}
    >
      <section className="canvas">
        <div
          className="canvas__svg"
          data-canvas-theme={canvasTheme}
          ref={canvasContainerRef}
          onPointerMove={thread.handlePointerMove}
          onPointerLeave={thread.clearCursor}
        >
          <svg
            ref={canvasSvgRef}
            width={weaveCanvas.viewW * zoom}
            height={weaveCanvas.viewH * zoom}
            viewBox={`0 0 ${weaveCanvas.viewW} ${weaveCanvas.viewH}`}
            className="canvas__svg-content"
          >
            <g transform={weaveCanvas.transform}>
            <g ref={canvasGroupRef} transform={`translate(${OFFSET_X}, ${OFFSET_Y})`}>
              <CrossWeaveRulers beads={beads} width={width} height={height} labelTransform={weaveCanvas.labelTransform} />

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
                  highlighted={highlightedBeadIds?.has(bead.id) ?? false}
                  onPointerEnter={handlePointerEnter}
                  onPointerDown={handlePointerDown}
                />
              ))}

              <WeaveLayer
                positions={weaveCanvas.positions}
                lastSegment={weave.lastSegment}
                active={weaveMode}
                showLast={weaveShowLast}
              />

              <ThreadLayer
                threads={threads}
                positionIndex={beadPositionIndex}
                liveTrace={thread.trace}
                liveCursor={thread.cursor}
                liveTraceSource={thread.liveTraceSource}
                interactive={!weaveMode && activeTool === 'thread'}
                onHandlePointerDown={thread.handleEndPointerDown}
                onHandlePointerMove={thread.handleEndPointerMove}
                onHandlePointerUp={thread.handleEndPointerUp}
                onHandlePointerCancel={thread.cancelHandleDrag}
                onRemove={onRemoveThread}
                onRemoveLastTracePoint={thread.removeLastPoint}
              />
            </g>
            </g>
          </svg>
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

      <ThreadTraceControls
        trace={thread.trace}
        onRemoveLastPoint={thread.removeLastPoint}
        onCancel={thread.cancel}
      />
    </CanvasSurface>
  );
};
