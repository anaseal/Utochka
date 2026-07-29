/* FILE: src\components\Editor\CanvasView\CanvasView.tsx */
import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Bead } from '../../../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement } from '../../../types/pendant';
import { Thread, ThreadCommitOptions } from '../../../types/thread';
import { PENDANT_SCALE } from '../../../data/pendantTemplates';
import { BeadGrid } from './BeadGrid';
import { WeaveLayer } from '../WeaveLayer/WeaveLayer';
import { WeaveTool, WeaveOrientation } from '../Header/WeaveControls';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { PendantLayer } from '../PendantLayer/PendantLayer';
import { PendantChainLayer } from '../PendantChainLayer/PendantChainLayer';
import { DecorTailLayer } from '../DecorTailLayer/DecorTailLayer';
import { ThreadLayer } from '../ThreadLayer/ThreadLayer';
import { CanvasChrome } from './CanvasChrome';
import { CanvasScrollbars } from './CanvasScrollbars';
import { CanvasSurface } from './CanvasSurface';
import { ThreadTraceControls } from './ThreadTraceControls';
import { BEAD_THEME, defaultColorFor } from '../../../config/theme';
import { mirrorBeadId } from '../../../utils/mirror';
import { chainBeadCountBetween, computeChainBeadPositions, expandChainRun } from '../../../utils/pendantChain';
import { buildBeadPositionIndex } from '../../../utils/beadPositions';
import { StampPattern } from '../../../utils/stamp';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng } from '../../../utils/exportScheme';
import {
  buildSegmentIndex, silyankaSegment, silyankaNodeClickSegment, silyankaPassCenter,
} from '../../../utils/weaveSegment';
import { WeaveProgressControls } from '../../../hooks/useWeaveProgress';
import { useWeaveCanvas } from '../../../hooks/useWeaveCanvas';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { useBeadCoords } from '../../../hooks/useBeadCoords';
import { useFrameThrottle } from '../../../hooks/useFrameThrottle';
import { useThreadTrace } from '../../../hooks/useThreadTrace';
import { useColorHighlight } from '../../../hooks/useColorHighlight';
import { computeCanvasDim } from '../../../utils/canvasDim';
import {
  swapColorInMap, swapColorInPendants, swapColorInChains, swapColorInDecorTails,
} from '../../../utils/colorSwap';
import './CanvasView.css';

// Порог в экранных пикселях, отличающий клик (постановка штампа) от драга
// (выделение рамкой) — независим от zoom, т.к. сравнивается в client-координатах.
// Используется только когда узор ещё не загружен (рисование новой рамки
// выделения) — пока узор загружен, тач вообще не завязан на этот порог: там
// касание сразу входит в режим «таскать превью» (см. handleStampContainerPointerDown,
// mode: 'movePreview'). Отдельное touch-значение выше десктопного — палец
// толще и дрожит сильнее курсора, случайный микро-сдвиг не должен рвать рамку.
const STAMP_DRAG_THRESHOLD = 4;
const STAMP_DRAG_THRESHOLD_TOUCH = 10;

interface CanvasViewProps {
  beads: Bead[];
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
  hoveredCol: number | null;
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
  threads: Thread[];
  onAddThread: (beadIds: string[], options?: ThreadCommitOptions) => void;
  onRerouteThreadEnd: (threadId: string, end: 'start' | 'end', traceBeadIds: string[]) => void;
  onRemoveThread: (id: string) => void;
  // «Кисть» нитки — цвет/прозрачность, которыми ляжет следующая нитка (см.
  // Header.tsx → ThreadStyleButton, useSilyankaProject.ts).
  activeThreadColor: string;
  activeThreadOpacity: number;
  chainPendingStart: number | null;
  onChainNodeClick: (col: number) => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
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
  ) => void;
  // Режим плетения: холст перестаёт рисовать и только отмечает прогресс.
  // Контролы режима живут в хедере (WeaveControls) — сюда приходят лишь
  // состояние и хранилище отметок (см. spec.md, «Режим плетения»).
  weaveMode: boolean;
  weaveTool: WeaveTool;
  weaveOrientation: WeaveOrientation;
  weaveFlipped: boolean;
  weave: WeaveProgressControls;
  // Показ рамки «здесь я остановилась»: включается кнопкой Locate в хедере
  // на пару секунд (App), а не горит постоянно.
  weaveShowLast: boolean;
}

export const CanvasView = ({
  beads,
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
  hoveredCol,
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
  threads,
  onAddThread,
  onRerouteThreadEnd,
  onRemoveThread,
  activeThreadColor,
  activeThreadOpacity,
  chainPendingStart,
  onChainNodeClick,
  canvasSvgRef,
  topEdgeEnabled,
  bottomEdgeEnabled,
  stampPattern,
  stampPreviewPatch,
  onStampSelect,
  onStampHover,
  onStampPlace,
  applyPatch,
  weaveMode,
  weaveTool,
  weaveOrientation,
  weaveFlipped,
  weave,
  weaveShowLast,
}: CanvasViewProps) => {

  const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
  const { nodeRadius } = BEAD_THEME.sizes;
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const stampGroupRef = useRef<SVGGElement>(null);
  const stampDragRef = useRef<{
    startClient: { x: number; y: number };
    startBead: { x: number; y: number };
    dragging: boolean;
    // 'select' — обычная логика клик/драг (десктоп: клик ставит копию,
    // драг рисует новую рамку). 'movePreview' — тач-режим с уже загруженным
    // узором: палец сразу таскает живое превью (см. handleStampContainerPointerMove),
    // отпускание коммитит; чтобы нарисовать новую рамку в этом состоянии,
    // узор сначала сбрасывают крестиком (см. spec.md, «Штамп»).
    mode: 'select' | 'movePreview';
  } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
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

  const dim = useMemo(() => {
    // Подвески свисают ниже сетки — учитываем их глубину в высоте SVG.
    // Якорь — pendantAnchors, а не bottomNodes: на колонке с декор-хвостом
    // подвеска висит от его кончика и уходит ниже, чем от голой ноды.
    let pendantMaxY = 0;
    for (const p of pendantPlacements) {
      const t = pendantTemplates[p.templateId];
      const anchor = pendantAnchors.find(n => n.logicalIndex.col === p.col);
      if (!t || !anchor) continue;
      let depth = -Infinity;
      for (const b of t.beads) {
        const reach = b.dy + (b.shape === 'circle' ? (b.r ?? 0) : (b.h ?? 0) / 2);
        if (reach > depth) depth = reach;
      }
      // +26: место под кнопку удаления ниже последней бусины
      pendantMaxY = Math.max(pendantMaxY, anchor.y + depth * PENDANT_SCALE + 26);
    }

    // Цепочки-подвески тоже провисают ниже сетки — учитываем глубину дуги.
    // Цепочки крепятся к настоящей ноде независимо от декор-хвоста на той
    // же колонке (см. spec.md, «Декор-хвост»), поэтому якорь — bottomNodes.
    let chainMaxY = 0;
    for (const c of pendantChains) {
      const start = bottomNodes.find(n => n.logicalIndex.col === c.startCol);
      const end = bottomNodes.find(n => n.logicalIndex.col === c.endCol);
      if (!start || !end) continue;
      const positions = computeChainBeadPositions(start, end);
      const maxY = Math.max(start.y, end.y, ...positions.map(p => p.y));
      chainMaxY = Math.max(chainMaxY, maxY + 26);
    }

    // Декор-хвосты — прямая колонка вниз от настоящей ноды.
    let decorTailMaxY = 0;
    for (const t of decorTailPlacements) {
      const anchor = bottomNodes.find(n => n.logicalIndex.col === t.col);
      if (!anchor) continue;
      decorTailMaxY = Math.max(decorTailMaxY, anchor.y + t.rows * decorRowStep + 26);
    }

    return computeCanvasDim(beads, effectiveOffsetX, offsetY, nodeRadius, {
      extraMaxY: Math.max(pendantMaxY, chainMaxY, decorTailMaxY),
    });
  }, [
    beads, effectiveOffsetX, offsetY, nodeRadius, pendantPlacements, pendantTemplates,
    pendantAnchors, bottomNodes, pendantChains, decorTailPlacements, decorRowStep,
  ]);

  // Второй палец на холсте отменяет любой начатый одним пальцем жест
  // (мазок карандаша/ластика, драг штампа, трассировка нитки) — переключение
  // на панораму/zoom. Поздняя привязка через ref: сброс трассировки живёт в
  // useThreadTrace, а тому, в свою очередь, нужен isMultiTouch отсюда — без
  // ref эти два хука ссылались бы друг на друга.
  const cancelActiveStrokeRef = useRef<() => void>(() => {});
  const cancelActiveStroke = useCallback(() => cancelActiveStrokeRef.current(), []);

  // Единая карта id → координаты по сетке, подвескам, цепочкам-подвесок и
  // декор-хвостам — нитка магнитится к любой бусине любого слоя (см.
  // spec.md, «Нитка»).
  const beadPositionIndex = useMemo(
    () => buildBeadPositionIndex(
      beads, pendantPlacements, pendantTemplates, pendantAnchors,
      pendantChains, bottomNodes, decorTailPlacements, decorRowStep,
    ),
    [
      beads, pendantPlacements, pendantTemplates, pendantAnchors,
      pendantChains, bottomNodes, decorTailPlacements, decorRowStep,
    ],
  );
  // В режиме плетения с горизонтальной ориентацией полотно физически
  // повёрнуто на 90° (см. useWeaveCanvas: rotated меняет местами viewW/viewH
  // относительно dim.w/dim.h) — реальный <svg> ниже получает width/height
  // именно от weaveCanvas.viewW/viewH, а не от dim. Без этой же поправки
  // здесь тач-жест и wheel-zoom писали бы в DOM во время пинча/панорамы/зума
  // пару размеров по ДРУГОЙ оси, чем стоит в неизменном во время жеста
  // viewBox — холст на время жеста схлопывался в исковерканный размер и
  // визуально «пропадал», пока React не перерисовывал верные width/height.
  const touchDim = weaveMode && weaveOrientation === 'horizontal'
    ? { w: dim.h, h: dim.w }
    : dim;
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
    stampDragRef.current = null;
    setSelectionRect(null);
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

  // Шеврон (.span-controls-toggle) «пришвартован» к левому краю карточки
  // холста и осмыслен только там (за ним прячется панель, живущая у левого
  // края сетки) — как только пользователь скроллит вправо, эта панель уезжает
  // за пределы видимой области, и шеврон поверх чужих колонок вводит в
  // заблуждение. Поэтому он скрыт всё время, пока scrollLeft > 0, и
  // появляется обратно не по таймеру, а только когда пользователь докрутит
  // холст обратно до левого края.
  const [isScrolledFromLeft, setIsScrolledFromLeft] = useState(false);
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const handleScroll = () => setIsScrolledFromLeft(el.scrollLeft > 0);
    handleScroll();
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Подвеска учитывается в статистике, только если у неё есть и валидный
  // шаблон, и живая нода-якорь на нижнем ряду (та же проверка, что и в
  // PendantLayer для occupiedCols).
  const validPendantPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return pendantPlacements.filter(
      (p) => pendantTemplates[p.templateId] && bottomCols.has(p.col),
    );
  }, [pendantPlacements, pendantTemplates, bottomNodes]);

  // Цепочка учитывается в статистике, только если у неё живы оба узла-якоря
  // на нижнем ряду (та же проверка, что и у validPendantPlacements).
  const validPendantChains = useMemo(() => {
    const nodeByCol = new Map(bottomNodes.map(n => [n.logicalIndex.col, n]));
    return pendantChains
      .map((c) => {
        const start = nodeByCol.get(c.startCol);
        const end = nodeByCol.get(c.endCol);
        if (!start || !end) return null;
        return { chain: c, count: chainBeadCountBetween(start, end) };
      })
      .filter((v): v is { chain: PendantChain; count: number } => v !== null);
  }, [pendantChains, bottomNodes]);

  // Хвост учитывается в статистике, только если у него жива нода-якорь на
  // нижнем ряду (та же проверка, что и у validPendantPlacements).
  const validDecorTailPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return decorTailPlacements.filter((t) => bottomCols.has(t.col));
  }, [decorTailPlacements, bottomNodes]);

  // Подвески, цепочки-подвески и декор-хвосты — тоже бисерины проекта,
  // поэтому досеиваются в общую сводку по цветам поверх прохода по сетке.
  const extendStats = useCallback((stats: Map<string, number>) => {
    validPendantPlacements.forEach((p) => {
      const template = pendantTemplates[p.templateId];
      template.beads.forEach((bead, index) => {
        const color = p.colorMap[index] ?? defaultColorFor(bead.type);
        stats.set(color, (stats.get(color) || 0) + 1);
      });
    });
    validPendantChains.forEach(({ chain, count }) => {
      for (let i = 0; i < count; i++) {
        const color = chain.colorMap[i] ?? defaultColorFor('SPAN');
        stats.set(color, (stats.get(color) || 0) + 1);
      }
    });
    validDecorTailPlacements.forEach((t) => {
      for (let i = 0; i < t.rows; i++) {
        const color = t.colorMap[i] ?? defaultColorFor('SPAN');
        stats.set(color, (stats.get(color) || 0) + 1);
      }
    });
  }, [validPendantPlacements, pendantTemplates, validPendantChains, validDecorTailPlacements]);

  const defaultColorOf = useCallback((bead: Bead) => defaultColorFor(bead.type), []);

  const replaceColor = useCallback((oldColor: string) => {
    applyPatch(
      (m) => swapColorInMap(m, oldColor, activeColor),
      (p) => swapColorInPendants(p, oldColor, activeColor),
      (c) => swapColorInChains(c, oldColor, activeColor),
      null,
      (t) => swapColorInDecorTails(t, oldColor, activeColor),
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

  const totalCount = useMemo(() => {
    const pendantBeadCount = validPendantPlacements.reduce(
      (sum, p) => sum + pendantTemplates[p.templateId].beads.length,
      0,
    );
    const chainBeadCount = validPendantChains.reduce((sum, { count }) => sum + count, 0);
    const decorTailBeadCount = validDecorTailPlacements.reduce((sum, t) => sum + t.rows, 0);
    return beads.length + pendantBeadCount + chainBeadCount + decorTailBeadCount;
  }, [beads.length, validPendantPlacements, pendantTemplates, validPendantChains, validDecorTailPlacements]);

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
  // подсвечиваем уже отмеченный узел нижнего ряда, пока не выбран второй.
  const chainPendingId = useMemo(() => {
    if (chainPendingStart === null) return null;
    return bottomNodes.find(n => n.logicalIndex.col === chainPendingStart)?.id ?? null;
  }, [chainPendingStart, bottomNodes]);

  const mirrorFn = useCallback(
    (id: string) => mirrorBeadId(id, width, internalTop, internalBottom, extendLeftEdge, extendRightEdge),
    [width, internalTop, internalBottom, extendLeftEdge, extendRightEdge],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);

  // Красит одну бисерину напрямую в DOM, в обход React — используется только
  // во время протяжки (см. paintBeadFast/strokeChangesRef в useDrawing.ts).
  // Держит в синхроне ровно то, что рендерит BeadView по тем же данным:
  // fill/--bead-color и класс bead--empty (см. BeadView.tsx/BeadView.css).
  const applyBeadColorDom = useCallback((id: string, color: string | undefined) => {
    const svg = canvasSvgRef.current;
    const g = svg?.ownerDocument.getElementById(id);
    if (!g) return;
    g.classList.toggle('bead--empty', !color);
    const body = g.querySelector('.bead__body') as SVGCircleElement | null;
    if (!body) return;
    const finalColor = color ?? defaultColorFor(g.classList.contains('bead--type-node') ? 'NODE' : 'SPAN');
    body.setAttribute('fill', finalColor);
    body.style.setProperty('--bead-color', finalColor);
  }, [canvasSvgRef]);

  const paintBeadFastAndDom = useCallback((id: string) => {
    applyBeadColorDom(id, paintBeadFast(id));
  }, [paintBeadFast, applyBeadColorDom]);
  const applyPaintFast = useMirrorPaint(paintBeadFastAndDom, mirrorMode, mirrorFn);

  // --- Режим плетения -------------------------------------------------------
  // Холст здесь ничего не рисует: клик и протяжка только отмечают, что уже
  // сплетено. Порядок плетения режим не знает и не навязывает (см. spec.md).
  const segmentIndex = useMemo(() => buildSegmentIndex(beads), [beads]);
  const beadById = useMemo(() => new Map(beads.map((b) => [b.id, b])), [beads]);
  // Нижний ряд узлов: у его узлов сегмент — разворот из обеих верхних граней
  // (см. silyankaNodeClickSegment).
  const bottomNodeRow = useMemo(() => {
    let max = -Infinity;
    for (const b of beads) {
      if (b.type === 'NODE' && b.logicalIndex.row > max) max = b.logicalIndex.row;
    }
    return max === -Infinity ? undefined : max;
  }, [beads]);

  const weaveBeadsFor = useCallback((id: string): string[] => {
    if (weaveTool !== 'segment') return [id];
    // Сегмент — один проход нити от узла до узла: «узел → грань → узел →
    // грань → узел». Сторона не зависит от жеста и места клика: плетение идёт
    // слева направо по экрану, а на отражённом полотне это другая сторона
    // сетки (см. silyankaNodeClickSegment и разметку шагов в spec.md).
    const pass = { mirrored: weaveFlipped, bottomRow: bottomNodeRow };
    const bead = beadById.get(id);
    if (bead?.type === 'NODE') {
      return silyankaNodeClickSegment(bead.logicalIndex.row, bead.logicalIndex.col, segmentIndex, pass);
    }
    // Клик по спану отмечает тот же сегмент: раз сторона фиксирована, пролёт
    // входит ровно в один проход, и центр однозначен.
    const center = silyankaPassCenter(id, weaveFlipped);
    if (center && segmentIndex.has(`node:${center.r}:${center.c}`)) {
      const ids = silyankaNodeClickSegment(center.r, center.c, segmentIndex, pass);
      // Страховка от края и среза Taper: если проход почему-то не содержит
      // саму кликнутую бисерину, отмечаем её группу, а не чужой сегмент.
      if (ids.includes(id)) return ids;
    }
    return silyankaSegment(id, segmentIndex);
  }, [weaveTool, beadById, segmentIndex, bottomNodeRow, weaveFlipped]);

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
    orientation: weaveOrientation,
    flipped: weaveFlipped,
    dim,
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
    if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && activeTool !== 'pendant-chain' && activeTool !== 'thread' && isDrawing) {
      applyPaintFast(id);
    }
  }, [weaveMode, weaveCanvas, activeTool, isDrawing, applyPaintFast]);

  const handlePointerDown = useCallback((id: string) => {
    if (weaveMode) {
      weaveCanvas.touch(id);
      return;
    }
    if (activeTool === 'thread') {
      thread.addPoint(id);
      return;
    }
    if (activeTool === 'stamp') return;
    if (activeTool === 'pendant-chain') {
      const node = bottomNodes.find(n => n.id === id);
      if (node) onChainNodeClick(node.logicalIndex.col);
      return;
    }
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [weaveMode, weaveCanvas, activeTool, applyPaint, onFloodFill, bottomNodes, onChainNodeClick, thread]);

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

  const findNearestNode = useCallback((point: { x: number; y: number }): Bead | null => {
    let nearest: Bead | null = null;
    let bestDist = Infinity;
    for (const bead of beads) {
      if (bead.type !== 'NODE') continue;
      const dx = bead.x - point.x;
      const dy = bead.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        nearest = bead;
      }
    }
    return nearest;
  }, [beads]);

  const handleStampContainerPointerDown = useCallback((e: React.PointerEvent) => {
    if (weaveMode || activeTool !== 'stamp') return;
    const beadPoint = toBeadCoords(e.clientX, e.clientY);
    if (!beadPoint) return;
    // На тач с уже загруженным узором нет наведения без контакта — поэтому
    // касание сразу входит в режим «таскать превью», а не ждёт превышения
    // порога драга (см. STAMP_DRAG_THRESHOLD_TOUCH — там он больше не нужен
    // для этого случая, только для рисования новой рамки без узора).
    const movePreview = e.pointerType === 'touch' && stampPattern !== null;
    stampDragRef.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startBead: beadPoint,
      dragging: false,
      mode: movePreview ? 'movePreview' : 'select',
    };
    if (movePreview) {
      const nearest = findNearestNode(beadPoint);
      onStampHover(nearest?.id ?? null);
    }
  }, [weaveMode, activeTool, toBeadCoords, stampPattern, findNearestNode, onStampHover]);

  // Линейный перебор всех бисерин в findNearestNode не нужен чаще одного раза
  // за кадр (см. useFrameThrottle). Не применяется к rect-драгу выделения
  // ниже — там нет поиска ближайшей бусины, только арифметика.
  const shouldThrottleHoverSearch = useFrameThrottle();

  const handleStampContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (weaveMode) return;
    if (activeTool === 'thread') {
      thread.handlePointerMove(e);
      return;
    }
    if (activeTool !== 'stamp' || touchGesture.isMultiTouch()) return;
    const drag = stampDragRef.current;
    if (drag) {
      if (drag.mode === 'movePreview') {
        if (shouldThrottleHoverSearch()) return;
        const beadPoint = toBeadCoords(e.clientX, e.clientY);
        const nearest = beadPoint ? findNearestNode(beadPoint) : null;
        onStampHover(nearest?.id ?? null);
        return;
      }
      const dx = e.clientX - drag.startClient.x;
      const dy = e.clientY - drag.startClient.y;
      const threshold = e.pointerType === 'touch' ? STAMP_DRAG_THRESHOLD_TOUCH : STAMP_DRAG_THRESHOLD;
      if (drag.dragging || Math.hypot(dx, dy) > threshold) {
        // Момент перехода клика в драг — прячем протухший preview старого
        // штампа, чтобы он не мешал видеть новую рамку выделения.
        if (!drag.dragging) onStampHover(null);
        drag.dragging = true;
        const beadPoint = toBeadCoords(e.clientX, e.clientY);
        if (beadPoint) {
          setSelectionRect({
            x: Math.min(drag.startBead.x, beadPoint.x),
            y: Math.min(drag.startBead.y, beadPoint.y),
            w: Math.abs(beadPoint.x - drag.startBead.x),
            h: Math.abs(beadPoint.y - drag.startBead.y),
          });
        }
      }
      return;
    }
    if (stampPattern) {
      if (shouldThrottleHoverSearch()) return;
      const beadPoint = toBeadCoords(e.clientX, e.clientY);
      const nearest = beadPoint ? findNearestNode(beadPoint) : null;
      onStampHover(nearest?.id ?? null);
    }
  }, [weaveMode, activeTool, toBeadCoords, stampPattern, findNearestNode, onStampHover, touchGesture.isMultiTouch, thread, shouldThrottleHoverSearch]);

  const handleStampContainerPointerUp = useCallback((e: React.PointerEvent) => {
    if (weaveMode || activeTool !== 'stamp' || touchGesture.isMultiTouch()) return;
    const drag = stampDragRef.current;
    stampDragRef.current = null;
    if (!drag) return;

    if (drag.mode === 'movePreview') {
      const beadPoint = toBeadCoords(e.clientX, e.clientY) ?? drag.startBead;
      const nearest = findNearestNode(beadPoint);
      if (nearest) onStampPlace(nearest.id);
      return;
    }

    if (drag.dragging) {
      const beadPoint = toBeadCoords(e.clientX, e.clientY) ?? drag.startBead;
      const minX = Math.min(drag.startBead.x, beadPoint.x);
      const maxX = Math.max(drag.startBead.x, beadPoint.x);
      const minY = Math.min(drag.startBead.y, beadPoint.y);
      const maxY = Math.max(drag.startBead.y, beadPoint.y);
      const ids = beads
        .filter(b => b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY)
        .map(b => b.id);
      setSelectionRect(null);
      onStampSelect(ids);
      return;
    }

    if (stampPattern) {
      const nearest = findNearestNode(drag.startBead);
      if (nearest) onStampPlace(nearest.id);
    }
  }, [weaveMode, activeTool, toBeadCoords, beads, onStampSelect, stampPattern, findNearestNode, onStampPlace, touchGesture.isMultiTouch]);

  const handleStampContainerPointerLeave = useCallback(() => {
    stampDragRef.current = null;
    setSelectionRect(null);
    thread.clearCursor();
    onStampHover(null);
  }, [onStampHover, thread]);

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
            onPointerDown={handleStampContainerPointerDown}
            onPointerMove={handleStampContainerPointerMove}
            onPointerUp={handleStampContainerPointerUp}
            onPointerLeave={handleStampContainerPointerLeave}
            onContextMenu={handleWeaveContextMenu}
          >
            <svg
              ref={canvasSvgRef}
              width={weaveCanvas.viewW * zoom}
              height={weaveCanvas.viewH * zoom}
              viewBox={`0 0 ${weaveCanvas.viewW} ${weaveCanvas.viewH}`}
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
              <g transform={weaveCanvas.transform}>
              <g ref={stampGroupRef} transform={`translate(${effectiveOffsetX + dim.shiftX}, ${offsetY})`}>
                <BeadGrid
                  beads={beads}
                  designMap={designMap}
                  highlightedNodeIds={highlightedNodeIds}
                  colorHighlightedBeadIds={highlightedBeadIds}
                  chainPendingId={chainPendingId}
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
                  labelTransform={weaveCanvas.labelTransform}
                />

                {selectionRect && (
                  <rect
                    className="canvas__stamp-rect"
                    x={selectionRect.x}
                    y={selectionRect.y}
                    width={selectionRect.w}
                    height={selectionRect.h}
                  />
                )}

                <PendantLayer
                  placements={pendantPlacements}
                  templates={pendantTemplates}
                  bottomNodes={pendantAnchors}
                  isDrawing={isDrawing}
                  onPaintBead={onPaintPendantBead}
                  onRemove={onRemovePlacement}
                  hoveredCol={hoveredCol}
                  mirrorMode={mirrorMode}
                  width={width}
                  highlightedColor={highlightedColor}
                  threadToolActive={activeTool === 'thread'}
                  onThreadPoint={thread.addPoint}
                />

                <PendantChainLayer
                  chains={pendantChains}
                  bottomNodes={bottomNodes}
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
