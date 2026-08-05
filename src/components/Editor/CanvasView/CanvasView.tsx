/* FILE: src\components\Editor\CanvasView\CanvasView.tsx */
import { useMemo, useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Bead } from '../../../types/bead';
import {
  PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement, ToothPlacement, ChainEndpoint,
  PendantAnchor,
} from '../../../types/pendant';
import { Thread, ThreadCommitOptions } from '../../../types/thread';
import { BeadGrid } from './BeadGrid';
import { WeaveLayer } from '../WeaveLayer/WeaveLayer';
import { WeaveTool } from '../Header/WeaveControls';
import { CanvasOrientation } from '../Header/Header.types';
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
import { mirrorBeadId } from '../../../utils/mirror';
import { expandChainRun } from '../../../utils/pendantChain';
import { buildBeadPositionIndex } from '../../../utils/beadPositions';
import { StampPattern } from '../../../utils/stamp';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng } from '../../../utils/exportScheme';
import { WeaveProgressControls } from '../../../hooks/useWeaveProgress';
import { useWeaveCanvas } from '../../../hooks/useWeaveCanvas';
import { useCanvasView } from '../../../hooks/useCanvasView';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { useBeadCoords } from '../../../hooks/useBeadCoords';
import { useThreadTrace } from '../../../hooks/useThreadTrace';
import { useColorHighlight } from '../../../hooks/useColorHighlight';
import { usePendantStats } from '../../../hooks/usePendantStats';
import { useSilyankaWeaveSegments } from '../../../hooks/useSilyankaWeaveSegments';
import { useStampTool } from '../../../hooks/useStampTool';
import { useFastPaint } from '../../../hooks/useFastPaint';
import { useScrolledFromLeft } from '../../../hooks/useScrolledFromLeft';
import { computeCanvasDim } from '../../../utils/canvasDim';
import { computeSilyankaExtraMaxY } from '../../../utils/pendantCanvasDim';
import { ToothMesh, toothBeadId } from '../../../utils/tooth';
import {
  swapColorInMap, swapColorInPendants, swapColorInChains, swapColorInDecorTails, swapColorInTeeth,
} from '../../../utils/colorSwap';
import './CanvasView.css';

interface CanvasViewProps {
  beads: Bead[];
  // Пометка «на удаление» (Bead и Segment пишут в один и тот же список,
  // см. useSilyankaProject.pendingDeleteIds) — бисерина остаётся в beads
  // (не удаляется), только рисуется пунктиром, пока не нажата кнопка
  // подтверждения в HolesSection.
  pendingDeleteIds: Set<string> | null;
  onToggleBeadPending: (id: string) => void;
  // «Hole segment»: карта id → бисерина (для проверки типа/наведённой ноды) и
  // предпросмотр текущего наведённого сегмента (нода + все её грани) — см.
  // useSilyankaProject.beadById/holeSegmentPreviewIds.
  beadById: Map<string, Bead>;
  holeSegmentPreviewIds: Set<string> | null;
  onHoleSegmentHover: (nodeId: string | null) => void;
  onToggleHoleSegmentPending: (nodeId: string) => void;
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
  onFloodFill: (id: string) => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom: (v: number) => void;
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  onRowSpanChange: (spanRowIndex: number, delta: number) => void;
  hoveredRow: number | null;
  mirrorMode: boolean;
  width: number;
  internalTop: number;
  internalBottom: number;
  extendLeftEdge: boolean;
  extendRightEdge: boolean;
  pendantPlacements: PendantPlacement[];
  pendantTemplates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  // Якорь ПОДВЕСКИ на колонку: bottomNodes либо (для колонок с декор-хвостом)
  // кончик хвоста — см. pendantAnchors в useSilyankaProject.ts. bottomNodes
  // остаётся настоящим якорем для цепочек и самого DecorTailLayer.
  pendantAnchors: Bead[];
  hoveredPendantAnchor: PendantAnchor | null;
  onPaintPendantBead: (placementId: string, beadIndex: number) => void;
  onRemovePlacement: (placementId: string) => void;
  pendantChains: PendantChain[];
  onPaintChainBead: (placementId: string, beadIndex: number) => void;
  onRemoveChain: (placementId: string) => void;
  decorTailPlacements: DecorTailPlacement[];
  decorRowStep: number;
  hoveredDecorTailCol: number | null;
  onPaintDecorTailBead: (placementId: string, beadIndex: number) => void;
  onRemoveDecorTail: (placementId: string) => void;
  teeth: ToothPlacement[];
  toothMeshes: Map<string, ToothMesh>;
  toothPendingStart: number | null;
  onToothNodeClick: (col: number) => void;
  onPaintToothBead: (placementId: string, beadIndex: number) => void;
  onRemoveTooth: (placementId: string) => void;
  threads: Thread[];
  onAddThread: (beadIds: string[], options?: ThreadCommitOptions) => void;
  onRerouteThreadEnd: (threadId: string, end: 'start' | 'end', traceBeadIds: string[]) => void;
  onRemoveThread: (id: string) => void;
  // «Кисть» нитки — цвет/прозрачность, которыми ляжет следующая нитка (см.
  // Header.tsx → ThreadStyleButton, useSilyankaProject.ts).
  activeThreadColor: string;
  activeThreadOpacity: number;
  chainPendingStart: ChainEndpoint | null;
  onChainNodeClick: (endpoint: ChainEndpoint) => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  // Группа-носитель координат бисерин — общая с PendantsSidebar (см.
  // useSilyankaProject.ts), чтобы драг подвески из каталога переводил
  // client-координаты через ту же useBeadCoords (getScreenCTM), которой здесь
  // пользуется нитка/стемп, а не отдельной ручной копией той же формулы.
  stampGroupRef: React.RefObject<SVGGElement | null>;
  topEdgeEnabled: boolean;
  bottomEdgeEnabled: boolean;
  stampPattern: StampPattern | null;
  stampPreviewPatch: Record<string, string> | null;
  onStampSelect: (ids: string[]) => void;
  onStampHover: (nodeId: string | null) => void;
  onStampPlace: (nodeId: string) => void;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: ((p: PendantPlacement[]) => PendantPlacement[]) | null,
    chainsFn?: ((c: PendantChain[]) => PendantChain[]) | null,
    threadsFn?: ((t: Thread[]) => Thread[]) | null,
    decorTailsFn?: ((d: DecorTailPlacement[]) => DecorTailPlacement[]) | null,
    teethFn?: ((t: ToothPlacement[]) => ToothPlacement[]) | null,
  ) => void;
  // Вид полотна (поворот/отражение) — общий для рисования и режима плетения
  // (см. useCanvasView.ts, spec.md «Поворот и отражение полотна»).
  orientation: CanvasOrientation;
  flipped: boolean;
  // Режим плетения: холст перестаёт рисовать и только отмечает прогресс.
  // Контролы режима живут в хедере (WeaveControls) — сюда приходят лишь
  // состояние и хранилище отметок (см. spec.md, «Режим плетения»).
  weaveMode: boolean;
  weaveTool: WeaveTool;
  weave: WeaveProgressControls;
  // Показ рамки «здесь я остановилась»: включается кнопкой Locate в хедере
  // на пару секунд (App), а не горит постоянно.
  weaveShowLast: boolean;
}

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
}: CanvasViewProps) => {

  const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
  const { nodeRadius } = BEAD_THEME.sizes;
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  // Сворачиваемый редактор количества бисерин (per-row span controls,
  // CanvasRulers) — свёрнут по умолчанию на всех ширинах экрана (столбик
  // ±/счётчиков — визуальный шум, нужен редко), раскрывается той же ручкой
  // .span-controls-toggle, что раньше была только на ≤767.98px. Видимость
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

  const thread = useThreadTrace({
    activeTool,
    threads,
    positionIndex: beadPositionIndex,
    hitboxRadius: BEAD_THEME.sizes.hitboxRadius,
    toBeadCoords,
    isMultiTouch: touchGesture.isMultiTouch,
    onAddThread,
    onRerouteThreadEnd,
    brushColor: activeThreadColor,
    brushOpacity: activeThreadOpacity,
    // Клик, перескочивший с одной бисерины цепочки-подвески сразу на другую
    // бисерину ТОЙ ЖЕ цепочки, достраивает путь через все промежуточные —
    // нитка физически не может миновать бисерины, уже нанизанные друг за
    // другом (см. expandChainRun).
    expandRun: expandChainRun,
  });

  cancelActiveStrokeRef.current = () => {
    stopDrawing();
    stamp.cancel();
    thread.cancelHandleDrag();
    thread.cancel();
    // Второй палец обрывает и уже идущий мазок отметок (режим плетения) —
    // без этого weaveCanvas.drawingRef оставался true во время всего
    // пинч/панорама-жеста, и продолжающееся движение первого пальца по
    // бисеринам продолжало бы их отмечать одновременно с зумом/панорамой
    // (см. комментарий в CanvasSurface про !isMultiTouch()). endStroke() —
    // no-op, если мазок и так не шёл.
    weaveCanvas.endStroke();
  };

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
  // резолвится через bottomNodes как раньше; узел зубца — напрямую через
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

  const mirrorFn = useCallback(
    (id: string) => mirrorBeadId(id, width, internalTop, internalBottom, extendLeftEdge, extendRightEdge),
    [width, internalTop, internalBottom, extendLeftEdge, extendRightEdge],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);
  const fastPaintDefaultColor = useCallback(
    (el: HTMLElement) => defaultColorFor(el.classList.contains('bead--type-node') ? 'NODE' : 'SPAN'),
    [],
  );
  const applyPaintFast = useFastPaint({
    canvasSvgRef, paintBeadFast, mirrorMode, mirrorFn, defaultColorOf: fastPaintDefaultColor,
  });

  // --- Режим плетения -------------------------------------------------------
  // Холст здесь ничего не рисует: клик и протяжка только отмечают, что уже
  // сплетено. Порядок плетения режим не знает и не навязывает (см. spec.md).
  const weaveBeadsFor = useSilyankaWeaveSegments({ beads, weaveTool, flipped });

  const radiusOf = useCallback(
    (bead: Bead) => (bead.type === 'NODE' ? BEAD_THEME.sizes.nodeRadius : BEAD_THEME.sizes.spanRadius),
    [],
  );

  const weaveCanvas = useWeaveCanvas({
    svgRef: canvasSvgRef,
    beads,
    weave,
    active: weaveMode,
    tool: weaveTool,
    radiusOf,
    resolveStrokeIds: weaveBeadsFor,
  });

  // 'thread' сюда не заходит: точки добавляются только явным кликом
  // (handlePointerDown), протяжка/наведение их не добавляет — см.
  // useThreadTrace.
  const handlePointerEnter = useCallback((id: string) => {
    if (weaveMode) {
      weaveCanvas.touchWhileDrawing(id);
      return;
    }
    if (activeTool === 'hole-segment') {
      const bead = beadById.get(id);
      if (bead?.type === 'NODE') {
        onHoleSegmentHover(id);
      } else if (!holeSegmentPreviewIds?.has(id)) {
        // Наведение ушло не на саму ноду и не на один из её же спанов (уже
        // подсвеченных этим предпросмотром) — только тогда гасим подсказку.
        // Так наведение с ноды на её собственную грань не гасит её раньше
        // времени (см. spec.md, «Hole segment»).
        onHoleSegmentHover(null);
      }
      return;
    }
    if (
      activeTool !== 'flood-fill' && activeTool !== 'stamp' && activeTool !== 'pendant-chain' &&
      activeTool !== 'tooth' && activeTool !== 'thread' && activeTool !== 'hole' && isDrawing
    ) {
      applyPaintFast(id);
    }
  }, [weaveMode, weaveCanvas, activeTool, isDrawing, applyPaintFast, beadById, holeSegmentPreviewIds, onHoleSegmentHover]);

  const handlePointerDown = useCallback((id: string) => {
    if (weaveMode) {
      weaveCanvas.touch(id);
      return;
    }
    if (activeTool === 'hole') {
      onToggleBeadPending(id);
      return;
    }
    if (activeTool === 'hole-segment') {
      onToggleHoleSegmentPending(id);
      return;
    }
    if (activeTool === 'thread') {
      thread.addPoint(id);
      return;
    }
    if (activeTool === 'stamp') return;
    if (activeTool === 'pendant-chain') {
      const node = bottomNodes.find(n => n.id === id);
      if (node) onChainNodeClick({ kind: 'grid', col: node.logicalIndex.col });
      return;
    }
    if (activeTool === 'tooth') {
      const node = bottomNodes.find(n => n.id === id);
      if (node) onToothNodeClick(node.logicalIndex.col);
      return;
    }
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [
    weaveMode, weaveCanvas, activeTool, applyPaint, onFloodFill, bottomNodes, onChainNodeClick,
    onToothNodeClick, thread, onToggleBeadPending, onToggleHoleSegmentPending,
  ]);

  // Правый клик снимает один проход — обратное действие к обычной отметке.
  const handleWeaveContextMenu = useCallback((e: React.MouseEvent) => {
    if (!weaveMode) return;
    e.preventDefault();
    const point = toBeadCoords(e.clientX, e.clientY);
    if (!point) return;
    let nearest: Bead | null = null;
    let bestDist = Infinity;
    for (const bead of beads) {
      const dist = (bead.x - point.x) ** 2 + (bead.y - point.y) ** 2;
      if (dist < bestDist) { bestDist = dist; nearest = bead; }
    }
    const threshold = BEAD_THEME.sizes.hitboxRadius;
    if (!nearest || bestDist > threshold * threshold) return;
    weaveCanvas.unmark(weaveBeadsFor(nearest.id));
  }, [weaveMode, toBeadCoords, beads, weaveCanvas, weaveBeadsFor]);

  const stamp = useStampTool({
    active: !weaveMode && activeTool === 'stamp',
    // Штамп силянки годится только на узлы — фильтр раньше жил внутри
    // useStampTool.ts, вынесен сюда, чтобы хук принимал уже готовый список
    // мест для штампа и годился для Peyote (там валидны все бисерины, см.
    // PeyoteCanvasView.tsx).
    beads: useMemo(() => beads.filter(b => b.type === 'NODE'), [beads]),
    toBeadCoords,
    stampPattern,
    onStampHover,
    onStampSelect,
    onStampPlace,
    isMultiTouch: touchGesture.isMultiTouch,
  });

  // pointerMove на контейнере холста маршрутизирует между двумя точечными
  // инструментами: 'thread' ведёт курсор трассировки, 'stamp' — драг/превью
  // (сам useStampTool уже гейтит себя по activeTool==='stamp' через active).
  const handleStampContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (weaveMode) return;
    if (activeTool === 'thread') {
      thread.handlePointerMove(e);
      return;
    }
    stamp.handlePointerMove(e);
  }, [weaveMode, activeTool, thread, stamp]);

  const handleStampContainerPointerLeave = useCallback(() => {
    stamp.handlePointerLeave();
    thread.clearCursor();
    onHoleSegmentHover(null);
  }, [stamp, thread, onHoleSegmentHover]);

  const handleExport = useCallback(() => {
    const svg = canvasSvgRef.current;
    if (!svg) return;
    exportSchemeToPng(svg, colorStats, totalCount, canvasTheme).catch((err) => {
      console.error('Failed to export scheme:', err);
    });
  }, [canvasSvgRef, colorStats, totalCount, canvasTheme]);

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
            onPointerMove={handleStampContainerPointerMove}
            onPointerUp={stamp.handlePointerUp}
            onPointerLeave={handleStampContainerPointerLeave}
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
