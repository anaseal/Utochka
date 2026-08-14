/* FILE: src\components\Editor\CanvasView\CanvasView.tsx */
import { useMemo, useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Bead } from '../../../types/bead';
import { BeadGrid } from './BeadGrid';
import { WeaveLayer } from '../WeaveLayer/WeaveLayer';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { PendantLayer } from '../PendantLayer/PendantLayer';
import { PendantChainLayer } from '../PendantChainLayer/PendantChainLayer';
import { DecorTailLayer } from '../DecorTailLayer/DecorTailLayer';
import { ToothLayer } from '../ToothLayer/ToothLayer';
import { ThreadLayer } from '../ThreadLayer/ThreadLayer';
import { CanvasChrome } from './CanvasChrome';
import { CanvasScrollbars } from './CanvasScrollbars';
import { CanvasSurface } from './CanvasSurface';
import { ThreadTraceControls } from './ThreadTraceControls';
import { BEAD_THEME, defaultColorFor } from '../../../config/theme';
import { buildBeadPositionIndex } from '../../../utils/beadPositions';
import { exportSchemeToPng } from '../../../utils/exportScheme';
import { useCanvasView } from '../../../hooks/useCanvasView';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useBeadCoords } from '../../../hooks/useBeadCoords';
import { useColorHighlight } from '../../../hooks/useColorHighlight';
import { usePendantStats } from '../../../hooks/usePendantStats';
import { useSilyankaCanvasTools } from '../../../hooks/useSilyankaCanvasTools';
import { useScrolledFromLeft } from '../../../hooks/useScrolledFromLeft';
import { computeCanvasDim } from '../../../utils/canvasDim';
import { computeSilyankaExtraMaxY } from '../../../utils/pendantCanvasDim';
import { toothBeadId } from '../../../utils/tooth';
import {
  swapColorInMap, swapColorInPendants, swapColorInChains, swapColorInDecorTails, swapColorInTeeth,
} from '../../../utils/colorSwap';
import { CanvasViewProps } from './CanvasView.types';
import './CanvasView.css';

export const CanvasView = ({
  beads,
  pendingDeleteIds,
  onToggleBeadPending,
  beadById,
  holeSegmentPreviewIds,
  onHoleSegmentHover,
  onToggleHoleSegmentPending,
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
  onFloodFill,
  zoom,
  onZoomChange,
  onSetZoom,
  topSpan,
  bottomSpan,
  rowSpanOverrides,
  onRowSpanChange,
  hoveredRow,
  mirrorMode,
  width,
  internalTop,
  internalBottom,
  extendLeftEdge,
  extendRightEdge,
  pendantPlacements,
  pendantTemplates,
  bottomNodes,
  pendantAnchors,
  hoveredPendantAnchor,
  onPaintPendantBead,
  onRemovePlacement,
  pendantChains,
  onPaintChainBead,
  onRemoveChain,
  decorTailPlacements,
  decorRowStep,
  hoveredDecorTailCol,
  onPaintDecorTailBead,
  onRemoveDecorTail,
  teeth,
  toothMeshes,
  toothPendingStart,
  onToothNodeClick,
  onPaintToothBead,
  onRemoveTooth,
  threads,
  onAddThread,
  onRerouteThreadEnd,
  onRemoveThread,
  activeThreadColor,
  activeThreadOpacity,
  chainPendingStart,
  onChainNodeClick,
  canvasSvgRef,
  stampGroupRef,
  topEdgeEnabled,
  bottomEdgeEnabled,
  stampPattern,
  stampPreviewPatch,
  onStampSelect,
  onStampHover,
  onStampPlace,
  applyPatch,
  orientation,
  flipped,
  weaveMode,
  weaveTool,
  weave,
  weaveShowLast,
  showToast,
}: CanvasViewProps) => {

  const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
  const { nodeRadius } = BEAD_THEME.sizes;
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  // Сворачиваемый редактор количества бисерин (per-row span controls,
  // CanvasRulers) — свёрнут по умолчанию на всех ширинах экрана (столбик
  // ±/счётчиков — визуальный шум, нужен редко), раскрывается ручкой
  // .span-controls-toggle — она есть на всех ширинах экрана. Видимость
  // самого столбика даёт CSS-класс .span-ctrl-layer--collapsed
  // (CanvasRulers.css, без брейкпоинта). Отступ слева под эти контролы
  // (offsetX) — числовой SVG-параметр, а не CSS-свойство, поэтому сужаем его
  // здесь же, в JS, синхронно с тем же состоянием.
  const [spanControlsExpanded, setSpanControlsExpanded] = useState(false);
  const effectiveOffsetX = spanControlsExpanded
    ? offsetX
    : BEAD_THEME.gridDefaults.offsetXCollapsed;

  // Подвески, цепочки-подвески, декор-хвосты и зубцы свисают ниже сетки —
  // учитываем это в высоте SVG (см. computeSilyankaExtraMaxY).
  const dim = useMemo(() => computeCanvasDim(beads, effectiveOffsetX, offsetY, nodeRadius, {
    extraMaxY: computeSilyankaExtraMaxY(
      pendantPlacements, pendantTemplates, pendantAnchors, pendantChains, bottomNodes,
      decorTailPlacements, decorRowStep, teeth, toothMeshes,
    ),
  }), [
    beads, effectiveOffsetX, offsetY, nodeRadius, pendantPlacements, pendantTemplates,
    pendantAnchors, bottomNodes, pendantChains, decorTailPlacements, decorRowStep,
    teeth, toothMeshes,
  ]);

  // Второй палец на холсте отменяет любой начатый одним пальцем жест
  // (мазок карандаша/ластика, драг штампа, трассировка нитки) — переключение
  // на панораму/zoom. Поздняя привязка через ref: сброс трассировки живёт в
  // useThreadTrace, а тому, в свою очередь, нужен isMultiTouch отсюда — без
  // ref эти два хука ссылались бы друг на друга.
  const cancelActiveStrokeRef = useRef<() => void>(() => {});
  const cancelActiveStroke = useCallback(() => cancelActiveStrokeRef.current(), []);

  // Единая карта id → координаты по сетке, подвескам, цепочкам-подвесок,
  // декор-хвостам и зубцам — нитка магнитится к любой бусине любого слоя
  // (см. spec.md, «Нитка»).
  const beadPositionIndex = useMemo(
    () => buildBeadPositionIndex(
      beads, pendantPlacements, pendantTemplates, pendantAnchors,
      pendantChains, bottomNodes, decorTailPlacements, decorRowStep,
      teeth, toothMeshes,
    ),
    [
      beads, pendantPlacements, pendantTemplates, pendantAnchors,
      pendantChains, bottomNodes, decorTailPlacements, decorRowStep,
      teeth, toothMeshes,
    ],
  );
  // Вид полотна (поворот/отражение) — общий для рисования и режима плетения
  // (см. useCanvasView.ts). При горизонтальной ориентации полотно физически
  // повёрнуто на 90° (canvasView.viewW/viewH меняют местами dim.w/dim.h) —
  // реальный <svg> ниже получает width/height именно от canvasView.viewW/
  // viewH, а не от dim. Без этой же поправки здесь тач-жест и wheel-zoom
  // писали бы в DOM во время пинча/панорамы/зума пару размеров по ДРУГОЙ
  // оси, чем стоит в неизменном во время жеста viewBox — холст на время
  // жеста схлопывался бы в исковерканный размер и визуально «пропадал»,
  // пока React не перерисовывал верные width/height.
  const canvasView = useCanvasView({ orientation, flipped, dim });
  const touchDim = { w: canvasView.viewW, h: canvasView.viewH };
  useWheelZoom(canvasContainerRef, canvasSvgRef, zoom, touchDim, onZoomChange);
  const touchGesture = useTouchPanZoom(canvasContainerRef, canvasSvgRef, zoom, touchDim, onSetZoom, cancelActiveStroke);
  const { statsRef, reserve: statsReserve } = useStatsReserve(140);

  // Переводит client-координаты указателя в систему координат бисерин.
  const toBeadCoords = useBeadCoords(stampGroupRef, canvasSvgRef);

  // Инструменты холста и разводка pointer-событий между ними — целиком в
  // useSilyankaCanvasTools, здесь остаются только размеры полотна и разметка.
  const {
    thread, stamp, weaveCanvas,
    handlePointerEnter, handlePointerDown, handleWeaveContextMenu,
    handleContainerPointerMove, handleContainerPointerLeave,
  } = useSilyankaCanvasTools({
    beads, beadById, bottomNodes, activeTool, isDrawing, stopDrawing, paintBead, paintBeadFast,
    onFloodFill, mirrorMode, width, internalTop, internalBottom, extendLeftEdge, extendRightEdge,
    threads, beadPositionIndex, onAddThread, onRerouteThreadEnd, activeThreadColor,
    activeThreadOpacity, onChainNodeClick, onToothNodeClick, onToggleBeadPending,
    onToggleHoleSegmentPending, onHoleSegmentHover, holeSegmentPreviewIds, stampPattern,
    onStampHover, onStampSelect, onStampPlace, weaveMode, weaveTool, weave, flipped,
    canvasSvgRef, toBeadCoords, isMultiTouch: touchGesture.isMultiTouch, cancelActiveStrokeRef,
  });

  const isScrolledFromLeft = useScrolledFromLeft(canvasContainerRef);

  const { extendStats, totalCount } = usePendantStats({
    beads, pendantPlacements, pendantTemplates, bottomNodes, pendantChains, decorTailPlacements,
    teeth, toothMeshes,
  });

  const defaultColorOf = useCallback((bead: Bead) => defaultColorFor(bead.type), []);

  const replaceColor = useCallback((oldColor: string) => {
    applyPatch(
      (m) => swapColorInMap(m, oldColor, activeColor),
      (p) => swapColorInPendants(p, oldColor, activeColor),
      (c) => swapColorInChains(c, oldColor, activeColor),
      null,
      (t) => swapColorInDecorTails(t, oldColor, activeColor),
      (t) => swapColorInTeeth(t, oldColor, activeColor),
    );
  }, [applyPatch, activeColor]);

  const {
    highlightedColor, highlightedBeadIds, colorStats, toggleHighlight, replaceColor: handleReplaceColor,
  } = useColorHighlight({
    beads,
    designMap,
    isDrawing,
    defaultColorOf,
    onReplaceColor: replaceColor,
    extendStats,
  });

  const highlightedNodeIds = useMemo(() => {
    if (hoveredRow === null) return null;
    const ids = new Set<string>();
    beads.forEach(b => {
      if (b.type === 'NODE' && b.logicalIndex.row === hoveredRow) {
        ids.add(b.id);
      }
    });
    return ids;
  }, [hoveredRow, beads]);

  // Незавершённый выбор начала цепочки (инструмент 'pendant-chain') —
  // подсвечиваем уже отмеченный узел, пока не выбран второй. Узел сетки
  // резолвится через bottomNodes; узел зубца — напрямую через
  // toothBeadId (его id и так совпадает с канонической схемой ToothLayer).
  // Один и тот же id передаётся и в BeadGrid, и в ToothLayer — каждый слой
  // просто не найдёт совпадения для чужого id.
  const chainPendingId = useMemo(() => {
    if (chainPendingStart === null) return null;
    if (chainPendingStart.kind === 'grid') {
      return bottomNodes.find(n => n.logicalIndex.col === chainPendingStart.col)?.id ?? null;
    }
    return toothBeadId(chainPendingStart.placementId, chainPendingStart.beadIndex);
  }, [chainPendingStart, bottomNodes]);

  // То же самое для зубца (инструмент 'tooth') — независимый незавершённый
  // выбор, см. toothPendingStart в useSilyankaProject.ts.
  const toothPendingId = useMemo(() => {
    if (toothPendingStart === null) return null;
    return bottomNodes.find(n => n.logicalIndex.col === toothPendingStart)?.id ?? null;
  }, [toothPendingStart, bottomNodes]);

  const handleExport = useCallback(() => {
    const svg = canvasSvgRef.current;
    if (!svg) return;
    exportSchemeToPng(svg, colorStats, totalCount, canvasTheme).catch((err) => {
      console.error('Failed to export scheme:', err);
      showToast('Export failed', 'error');
    });
  }, [canvasSvgRef, colorStats, totalCount, canvasTheme, showToast]);

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
        {/* Обёртка нужна только затем, чтобы дать ручке (.span-controls-toggle)
            позиционирующий контекст, совпадающий с рамкой карточки холста
            (canvas__svg), но НЕ являющийся самой прокручиваемой областью —
            иначе ручка, лежащая внутри overflow:auto контейнера, уезжала бы
            при скролле сетки бисерин вместе с содержимым. */}
        <div className="canvas__svg-frame">
          <div
            className="canvas__svg"
            data-canvas-theme={canvasTheme}
            ref={canvasContainerRef}
            onPointerDown={stamp.handlePointerDown}
            onPointerMove={handleContainerPointerMove}
            onPointerUp={stamp.handlePointerUp}
            onPointerLeave={handleContainerPointerLeave}
            onContextMenu={handleWeaveContextMenu}
          >
            <svg
              ref={canvasSvgRef}
              width={canvasView.viewW * zoom}
              height={canvasView.viewH * zoom}
              viewBox={`0 0 ${canvasView.viewW} ${canvasView.viewH}`}
              className="canvas__svg-content"
            >
              {/* Группа трансформации: отделяем визуальный отступ от логики координат.
                  effectiveOffsetX уже (offsetXCollapsed) при свёрнутых
                  span-контролах, шире (offsetX) при развёрнутых — освобождает
                  место, которое иначе пустовало бы под скрытыми ±/счётчиками.
                  dim.shiftX — доп. место, когда сетка
                  заходит левее x=0 (см. canvasDim.ts); панель линейки получает
                  тот же сдвиг в обратную сторону внутри себя (gutterShiftX на
                  BeadGrid/CanvasRulers), чтобы визуально остаться на месте, а
                  не наехать на новые крайние бисерины. */}
              <g transform={canvasView.transform}>
              <g ref={stampGroupRef} transform={`translate(${effectiveOffsetX + dim.shiftX}, ${offsetY})`}>
                <BeadGrid
                  beads={beads}
                  pendingDeleteIds={(activeTool === 'hole' || activeTool === 'hole-segment') ? pendingDeleteIds : null}
                  deletePreviewIds={activeTool === 'hole-segment' ? holeSegmentPreviewIds : null}
                  designMap={designMap}
                  highlightedNodeIds={highlightedNodeIds}
                  colorHighlightedBeadIds={highlightedBeadIds}
                  chainPendingId={chainPendingId}
                  toothPendingId={toothPendingId}
                  stampPreviewPatch={stampPreviewPatch}
                  onPointerEnter={handlePointerEnter}
                  onPointerDown={handlePointerDown}
                  topSpan={topSpan}
                  bottomSpan={bottomSpan}
                  rowSpanOverrides={rowSpanOverrides}
                  onRowSpanChange={onRowSpanChange}
                  width={width}
                  topEdgeEnabled={topEdgeEnabled}
                  bottomEdgeEnabled={bottomEdgeEnabled}
                  spanControlsExpanded={spanControlsExpanded}
                  gutterShiftX={dim.shiftX}
                  labelTransform={canvasView.labelTransform}
                />

                {stamp.selectionRect && (
                  <rect
                    className="canvas__stamp-rect"
                    x={stamp.selectionRect.x}
                    y={stamp.selectionRect.y}
                    width={stamp.selectionRect.w}
                    height={stamp.selectionRect.h}
                  />
                )}

                <PendantLayer
                  placements={pendantPlacements}
                  templates={pendantTemplates}
                  bottomNodes={pendantAnchors}
                  toothMeshes={toothMeshes}
                  teeth={teeth}
                  isDrawing={isDrawing}
                  onPaintBead={onPaintPendantBead}
                  onRemove={onRemovePlacement}
                  hoveredAnchor={hoveredPendantAnchor}
                  mirrorMode={mirrorMode}
                  width={width}
                  highlightedColor={highlightedColor}
                  threadToolActive={activeTool === 'thread'}
                  onThreadPoint={thread.addPoint}
                />

                <PendantChainLayer
                  chains={pendantChains}
                  bottomNodes={bottomNodes}
                  toothMeshes={toothMeshes}
                  isDrawing={isDrawing}
                  onPaintBead={onPaintChainBead}
                  onRemove={onRemoveChain}
                  highlightedColor={highlightedColor}
                  threadToolActive={activeTool === 'thread'}
                  onThreadPoint={thread.addPoint}
                />

                <DecorTailLayer
                  placements={decorTailPlacements}
                  bottomNodes={bottomNodes}
                  decorRowStep={decorRowStep}
                  isDrawing={isDrawing}
                  onPaintBead={onPaintDecorTailBead}
                  onRemove={onRemoveDecorTail}
                  hoveredCol={hoveredDecorTailCol}
                  mirrorMode={mirrorMode}
                  width={width}
                  highlightedColor={highlightedColor}
                  threadToolActive={activeTool === 'thread'}
                  onThreadPoint={thread.addPoint}
                />

                <ToothLayer
                  teeth={teeth}
                  toothMeshes={toothMeshes}
                  isDrawing={isDrawing}
                  onPaintBead={onPaintToothBead}
                  onRemove={onRemoveTooth}
                  highlightedColor={highlightedColor}
                  threadToolActive={activeTool === 'thread'}
                  onThreadPoint={thread.addPoint}
                  chainToolActive={activeTool === 'pendant-chain'}
                  onChainNodeClick={(placementId, beadIndex) =>
                    onChainNodeClick({ kind: 'tooth', placementId, beadIndex })}
                  chainPendingBeadId={chainPendingId}
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

          {/* Ручка выдвижной панели редактора количества бисерин (per-row span
              controls в CanvasRulers) — видна на всех ширинах экрана: эти
              контролы по умолчанию свёрнуты везде (см. CanvasRulers.css).
              position:absolute относительно .canvas__svg-frame (которая
              размером точно совпадает с самой карточкой .canvas__svg, но не
              скроллится) — лежит поверх карточки, не уезжая при скролле
              сетки бисерин. Шеврон вместо абстрактной иконки — однозначно
              читаемый знак "тут скрыта панель, нажми, чтобы раскрыть",
              направление меняется на противоположное при раскрытии (›
              свёрнуто → ‹ открыто). Не в CanvasChrome — та шарится
              байт-в-байт с CrossWeaveCanvasView, а у CrossWeave этой фичи
              нет вовсе (CrossWeaveRulers). */}
          <button
            type="button"
            className={`span-controls-toggle${isScrolledFromLeft ? ' span-controls-toggle--hidden' : ''}`}
            onClick={() => setSpanControlsExpanded(v => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            title={spanControlsExpanded ? 'Hide bead count editor' : 'Show bead count editor'}
            aria-pressed={spanControlsExpanded}
          >
            {spanControlsExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
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
