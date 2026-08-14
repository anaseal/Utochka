import { RefObject, useCallback, useMemo } from 'react';
import { Bead } from '../types/bead';
import { ChainEndpoint } from '../types/pendant';
import { Thread, ThreadCommitOptions } from '../types/thread';
import { ThreadAnchor } from '../utils/beadPositions';
import { BEAD_THEME, defaultColorFor } from '../config/theme';
import { mirrorBeadId } from '../utils/mirror';
import { expandChainRun } from '../utils/pendantChain';
import { StampPattern } from '../utils/stamp';
import { WeaveTool } from '../components/Editor/Header/WeaveControls';
import { DrawingTool } from './useDrawing';
import { WeaveProgressControls } from './useWeaveProgress';
import { ToBeadCoords } from './useBeadCoords';
import { useThreadTrace } from './useThreadTrace';
import { useStampTool } from './useStampTool';
import { useWeaveCanvas } from './useWeaveCanvas';
import { useSilyankaWeaveSegments } from './useSilyankaWeaveSegments';
import { useMirrorPaint } from './useMirrorPaint';
import { useFastPaint } from './useFastPaint';

// Вся интерактивность полотна силянки: какие инструменты живут на холсте и что
// каждый из них делает с бисериной под указателем. Отделено от CanvasView.tsx,
// где остались только вход компонента, размеры холста и разметка SVG.
//
// Общими для четырёх техник эти обработчики не становятся: инструменты
// 'pendant-chain', 'tooth', 'hole-segment' есть только у силянки, а у Peyote,
// Loom и крестика свои наборы и свои копии разводки. Общее между техниками
// живёт уровнем ниже — в useThreadTrace, useStampTool, useWeaveCanvas,
// useFastPaint, которые этот хук и собирает.
interface UseSilyankaCanvasToolsOptions {
  beads: Bead[];
  beadById: Map<string, Bead>;
  bottomNodes: Bead[];
  activeTool: DrawingTool;
  isDrawing: boolean;
  stopDrawing: () => void;
  paintBead: (id: string) => void;
  paintBeadFast: (id: string) => string | undefined;
  onFloodFill: (id: string) => void;
  // Зеркальное рисование: id парной бисерины считается по геометрии сетки,
  // поэтому хук берёт её параметры, а не готовую функцию.
  mirrorMode: boolean;
  width: number;
  internalTop: number;
  internalBottom: number;
  extendLeftEdge: boolean;
  extendRightEdge: boolean;
  threads: Thread[];
  beadPositionIndex: Map<string, ThreadAnchor>;
  onAddThread: (beadIds: string[], options?: ThreadCommitOptions) => void;
  onRerouteThreadEnd: (threadId: string, end: 'start' | 'end', traceBeadIds: string[]) => void;
  activeThreadColor: string;
  activeThreadOpacity: number;
  onChainNodeClick: (endpoint: ChainEndpoint) => void;
  onToothNodeClick: (col: number) => void;
  onToggleBeadPending: (id: string) => void;
  onToggleHoleSegmentPending: (nodeId: string) => void;
  onHoleSegmentHover: (nodeId: string | null) => void;
  holeSegmentPreviewIds: Set<string> | null;
  stampPattern: StampPattern | null;
  onStampHover: (nodeId: string | null) => void;
  onStampSelect: (ids: string[]) => void;
  onStampPlace: (nodeId: string) => void;
  weaveMode: boolean;
  weaveTool: WeaveTool;
  weave: WeaveProgressControls;
  flipped: boolean;
  canvasSvgRef: RefObject<SVGSVGElement | null>;
  toBeadCoords: ToBeadCoords;
  isMultiTouch: () => boolean;
  // Заполняется здесь, а объявляется в CanvasView: этот же реф уходит в
  // useTouchPanZoom, который вызывается раньше (см. там же).
  cancelActiveStrokeRef: RefObject<() => void>;
}

export const useSilyankaCanvasTools = ({
  beads,
  beadById,
  bottomNodes,
  activeTool,
  isDrawing,
  stopDrawing,
  paintBead,
  paintBeadFast,
  onFloodFill,
  mirrorMode,
  width,
  internalTop,
  internalBottom,
  extendLeftEdge,
  extendRightEdge,
  threads,
  beadPositionIndex,
  onAddThread,
  onRerouteThreadEnd,
  activeThreadColor,
  activeThreadOpacity,
  onChainNodeClick,
  onToothNodeClick,
  onToggleBeadPending,
  onToggleHoleSegmentPending,
  onHoleSegmentHover,
  holeSegmentPreviewIds,
  stampPattern,
  onStampHover,
  onStampSelect,
  onStampPlace,
  weaveMode,
  weaveTool,
  weave,
  flipped,
  canvasSvgRef,
  toBeadCoords,
  isMultiTouch,
  cancelActiveStrokeRef,
}: UseSilyankaCanvasToolsOptions) => {
  const thread = useThreadTrace({
    activeTool,
    threads,
    positionIndex: beadPositionIndex,
    hitboxRadius: BEAD_THEME.sizes.hitboxRadius,
    toBeadCoords,
    isMultiTouch,
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

  const stamp = useStampTool({
    active: !weaveMode && activeTool === 'stamp',
    // Штамп силянки ставится только на узел — привязка курсора работает
    // только по NODE (фильтр стоит здесь, а не внутри useStampTool.ts: хук
    // принимает уже готовый список мест под штамп и потому годится и для
    // Peyote, где валидны все бисерины, см. PeyoteCanvasView.tsx).
    beads: useMemo(() => beads.filter(b => b.type === 'NODE'), [beads]),
    // А вот рамка выделения при захвате узора должна видеть все бисерины,
    // не только узлы — иначе SPAN (ножки/плечи между узлами) не попадают в
    // ids и штамп копирует только узлы без связывающего их цвета.
    selectableBeads: beads,
    toBeadCoords,
    stampPattern,
    onStampHover,
    onStampSelect,
    onStampPlace,
    isMultiTouch,
  });

  // eslint-disable-next-line react-hooks/refs -- поздняя привязка, см. cancelActiveStrokeRef в опциях
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

  // pointerMove на контейнере холста маршрутизирует между двумя точечными
  // инструментами: 'thread' ведёт курсор трассировки, 'stamp' — драг/превью
  // (сам useStampTool уже гейтит себя по activeTool==='stamp' через active).
  const handleContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (weaveMode) return;
    if (activeTool === 'thread') {
      thread.handlePointerMove(e);
      return;
    }
    stamp.handlePointerMove(e);
  }, [weaveMode, activeTool, thread, stamp]);

  const handleContainerPointerLeave = useCallback(() => {
    stamp.handlePointerLeave();
    thread.clearCursor();
    onHoleSegmentHover(null);
  }, [stamp, thread, onHoleSegmentHover]);

  return {
    thread,
    stamp,
    weaveCanvas,
    handlePointerEnter,
    handlePointerDown,
    handleWeaveContextMenu,
    handleContainerPointerMove,
    handleContainerPointerLeave,
  };
};
