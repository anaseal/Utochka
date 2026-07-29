import { useCallback, useMemo, useRef, useState } from 'react';
import { useGrid } from './useGrid';
import { useDrawing } from './useDrawing';
import { usePendants } from './usePendants';
import { usePendantChains } from './usePendantChains';
import { useDecorTails } from './useDecorTails';
import { useThreads } from './useThreads';
import { useWeaveProgress } from './useWeaveProgress';
import { usePersistedState } from './usePersistedState';
import { useGridConfig } from './useGridConfig';
import { THREAD_STRAND_DEFAULT_COLORS, DEFAULT_THREAD_OPACITY } from '../config/theme';
import { PendantPlacement, PendantChain, DecorTailPlacement } from '../types/pendant';
import { Thread } from '../types/thread';
import { PENDANT_TEMPLATES_BY_ID } from '../data/pendantTemplates';
import { mirrorBeadId } from '../utils/mirror';
import { resolveSpanCount } from '../utils/spans';
import { fillMissingMirror } from '../utils/symmetrize';
import { computeUnifiedFloodFill, pendantBeadId } from '../utils/floodFill';
import { chainBeadId } from '../utils/pendantChain';
import { decorTailBeadId } from '../utils/decorTail';
import { getDecorRowStep } from '../utils/decorGeometry';
import {
  StampPattern, StampContext, StampAnchorEdge, captureStampPattern, applyStampPattern,
} from '../utils/stamp';
import {
  isPendantPlacements, isPendantChains, isDecorTailPlacements, isThreads, isHexColor, isOpacity,
} from './useSilyankaProject.validators';

// Всё силяночное состояние и обработчики, вынесенные из App.tsx, чтобы
// хостить вторую независимую технику (крестик) без дублирования ~400 строк.
// Геометрия сетки (размеры/спаны/скос/края) вынесена в useGridConfig —
// см. комментарий там же.
export const useSilyankaProject = (palette: readonly string[]) => {
  const [pendantPlacements, setPendantPlacements] = usePersistedState<PendantPlacement[]>(
    'silyanka:pendantPlacements', [], isPendantPlacements,
  );

  const [pendantChains, setPendantChains] = usePersistedState<PendantChain[]>(
    'silyanka:pendantChains', [], isPendantChains,
  );

  const [decorTailPlacements, setDecorTailPlacements] = usePersistedState<DecorTailPlacement[]>(
    'silyanka:decorTailPlacements', [], isDecorTailPlacements,
  );

  const [threads, setThreads] = usePersistedState<Thread[]>(
    'silyanka:threads', [], isThreads,
  );

  const drawingControls = useDrawing(
    palette[0], palette, pendantPlacements, setPendantPlacements,
    pendantChains, setPendantChains, decorTailPlacements, setDecorTailPlacements,
    threads, setThreads, 'silyanka',
  );

  const gridConfig = useGridConfig(
    pendantPlacements, setPendantPlacements, setPendantChains,
    decorTailPlacements, setDecorTailPlacements, drawingControls.remapDesignMap,
  );
  const {
    gridSize, rowSpanOverrides, mirrorMode, decorBands, bottomEdgeDecor,
    edgeExtension, topEdgeEnabled, taper,
  } = gridConfig;

  const beads = useGrid(gridSize, rowSpanOverrides, decorBands, bottomEdgeDecor, edgeExtension, topEdgeEnabled, taper);
  const threadControls = useThreads(threads, drawingControls.applyPatch);

  // Прогресс плетения — отдельно от рисунка и от его истории Undo/Redo
  // (см. useWeaveProgress).
  const weave = useWeaveProgress('silyanka');

  // «Кисть» нитки — цвет/прозрачность, которыми ляжет СЛЕДУЮЩАЯ прокладываемая
  // нитка (аналог activeColor для рисования бусин, см. Header.tsx →
  // ThreadStyleButton). Не часть Undo/Redo — как и activeColor, обычный
  // usePersistedState, не через drawingControls.applyPatch.
  const [activeThreadColor, setActiveThreadColor] = usePersistedState<string>(
    'silyanka:activeThreadColor', THREAD_STRAND_DEFAULT_COLORS[1], isHexColor,
  );
  const [activeThreadOpacity, setActiveThreadOpacity] = usePersistedState<number>(
    'silyanka:activeThreadOpacity', DEFAULT_THREAD_OPACITY, isOpacity,
  );

  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  // Драг карточки «Tail» (декор-хвост) — своя колонка-наведение, отдельная от
  // hoveredCol (тот подсвечивает цель драга ПОДВЕСКИ) и от hoveredRow (тот —
  // цель драга полосы Decor Bands на зазор между рядами).
  const [hoveredDecorTailCol, setHoveredDecorTailCol] = useState<number | null>(null);
  // Незавершённый выбор узла-начала цепочки (инструмент 'pendant-chain') —
  // null, пока не кликнули по первому узлу нижнего ряда.
  const [chainPendingStart, setChainPendingStart] = useState<number | null>(null);
  const [stampPattern, setStampPattern] = useState<StampPattern | null>(null);
  const [stampHoverNodeId, setStampHoverNodeId] = useState<string | null>(null);
  // Базовая точка привязки штампа: 'top' (по умолчанию) — targetAnchor
  // совмещается с верхним рядом захваченного мотива, 'bottom' — с нижним
  // (позволяет, например, поставить низ штампа к верхнему краю полотна).
  // Переключается кликом по бейджу у кнопки Stamp или клавишей Shift
  // (тап, не удержание — см. Shift-хендлер в App.tsx) — оба вызывают
  // toggleStampAnchorEdge и одинаково меняют это состояние насовсем.
  const [stampAnchorEdge, setStampAnchorEdge] = useState<StampAnchorEdge>('top');
  const canvasSvgRef = useRef<SVGSVGElement>(null);

  const rowGaps = useMemo(() => {
    const nodeRowYMap = new Map<number, number>();
    beads.filter(b => b.type === 'NODE').forEach(b => {
      if (!nodeRowYMap.has(b.logicalIndex.row)) nodeRowYMap.set(b.logicalIndex.row, b.y);
    });
    const sortedRows = [...nodeRowYMap.entries()].sort(([a], [b]) => a - b);
    return sortedRows.slice(0, -1).map(([r, y], i) => ({
      row: r,
      midY: (y + sortedRows[i + 1][1]) / 2,
    }));
  }, [beads]);

  const pendantControls = usePendants(
    pendantPlacements, setPendantPlacements,
    drawingControls.activeColor, drawingControls.activeTool,
    mirrorMode, gridSize.width,
  );

  const chainControls = usePendantChains(
    pendantChains, setPendantChains,
    drawingControls.activeColor, drawingControls.activeTool,
    mirrorMode, gridSize.width,
  );

  const decorTailControls = useDecorTails(
    decorTailPlacements, setDecorTailPlacements,
    drawingControls.activeColor, drawingControls.activeTool,
    mirrorMode, gridSize.width,
  );

  const bottomNodes = useMemo(() => beads.filter(
    b => b.type === 'NODE' && b.logicalIndex.row === 2 * gridSize.height,
  ), [beads, gridSize.height]);

  // Якорь ПОДВЕСКИ на колонку: настоящая нода нижнего ряда — либо, если на
  // этой колонке есть декор-хвост, его последняя бисерина. Единая точка
  // подмены: все потребители якоря подвески (PendantLayer, floodFill,
  // beadPositions, высота канваса в CanvasView) получают этот массив ВМЕСТО
  // bottomNodes, поэтому подвеска «висит на хвосте, как на ноде», не меняя
  // код ни в одном из них (см. spec.md, «Декор-хвост»). Цепочки-подвески и
  // сам DecorTailLayer в эту подмену НЕ входят — они всегда крепятся к
  // настоящей ноде (см. bottomNodes ниже).
  const decorRowStep = getDecorRowStep(gridSize.spacing);
  const pendantAnchors = useMemo(() => bottomNodes.map(n => {
    const tail = decorTailPlacements.find(t => t.col === n.logicalIndex.col);
    if (!tail) return n;
    return {
      ...n,
      id: decorTailBeadId(tail.placementId, tail.rows - 1),
      y: n.y + tail.rows * decorRowStep,
    };
  }), [bottomNodes, decorTailPlacements, decorRowStep]);

  const internalTop = topEdgeEnabled
    ? Math.max(0, resolveSpanCount(-1, gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides) - 2)
    : 0;

  const internalBottom = Math.max(
    0, resolveSpanCount(-2, gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides) - 2,
  );

  // Контекст трансляции id для штампа — та же геометрия, что видит generator.ts.
  const stampCtx = useMemo<StampContext>(() => ({
    topSpan: gridSize.topSpan,
    bottomSpan: gridSize.bottomSpan,
    rowSpanOverrides,
    decorBands,
    beadIds: new Set(beads.map(b => b.id)),
  }), [gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides, decorBands, beads]);

  // Полный патч (id -> цвет), а не просто набор id — превью должно показывать
  // готовый рисунок штампа на целевой позиции, а не только подсвеченный
  // контур (см. spec.md, «Штамп»).
  const stampPreviewPatch = useMemo<Record<string, string> | null>(() => {
    if (!stampPattern || !stampHoverNodeId) return null;
    const targetBead = beads.find(b => b.id === stampHoverNodeId);
    if (!targetBead) return null;
    return applyStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx, stampAnchorEdge);
  }, [stampPattern, stampHoverNodeId, stampAnchorEdge, beads, stampCtx]);

  const handleStampSelect = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const pattern = captureStampPattern(ids, beads, drawingControls.designMap);
    if (pattern.entries.length === 0) return;
    setStampPattern(pattern);
    setStampHoverNodeId(null);
  }, [beads, drawingControls.designMap]);

  const toggleStampAnchorEdge = useCallback(() => {
    setStampAnchorEdge(e => (e === 'top' ? 'bottom' : 'top'));
  }, []);

  const handleStampPlace = useCallback((nodeId: string) => {
    if (!stampPattern) return;
    const targetBead = beads.find(b => b.id === nodeId);
    if (!targetBead) return;
    const patch = applyStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx, stampAnchorEdge);
    if (Object.keys(patch).length === 0) return;

    drawingControls.remapDesignMap(prev => {
      const next = { ...prev, ...patch };
      if (mirrorMode) {
        for (const [id, color] of Object.entries(patch)) {
          const m = mirrorBeadId(id, gridSize.width, internalTop, internalBottom, edgeExtension.left, edgeExtension.right);
          if (m !== null && m !== id && stampCtx.beadIds.has(m)) next[m] = color;
        }
      }
      return next;
    });
  }, [stampPattern, beads, stampCtx, drawingControls, mirrorMode, gridSize.width, internalTop, internalBottom, stampAnchorEdge, edgeExtension]);

  // Заливка — единый граф сетки, подвесок, цепочек и декор-хвостов: подвеска
  // соединена со своей якорной нодой (или кончиком хвоста той же колонки,
  // если он есть — см. pendantAnchors), цепочка — с обоими концами, хвост —
  // со своей якорной нодой, поэтому цвет может «перетекать» между сеткой и
  // любым декором.
  const applyUnifiedFloodFill = useCallback((startId: string, mirrorStartId: string | null) => {
    const args = [
      beads, drawingControls.designMap, drawingControls.activeColor,
      pendantPlacements, PENDANT_TEMPLATES_BY_ID, pendantAnchors, bottomNodes,
      pendantChains, decorTailPlacements,
    ] as const;
    const r1 = computeUnifiedFloodFill(startId, ...args);
    const r2 = mirrorStartId
      ? computeUnifiedFloodFill(mirrorStartId, ...args)
      : { gridIds: [], pendantHits: [], chainHits: [], decorTailHits: [] };

    const gridIds = [...new Set([...r1.gridIds, ...r2.gridIds])];
    const pendantHits = [...r1.pendantHits, ...r2.pendantHits];
    const chainHits = [...r1.chainHits, ...r2.chainHits];
    const decorTailHits = [...r1.decorTailHits, ...r2.decorTailHits];
    if (
      gridIds.length === 0 && pendantHits.length === 0 &&
      chainHits.length === 0 && decorTailHits.length === 0
    ) return;

    const activeColor = drawingControls.activeColor;
    drawingControls.applyPatch(
      gridIds.length > 0
        ? (prev) => {
          const next = { ...prev };
          for (const id of gridIds) next[id] = activeColor;
          return next;
        }
        : null,
      pendantHits.length > 0
        ? (prev) => prev.map((p) => {
          const hits = pendantHits.filter(h => h.placementId === p.placementId);
          if (hits.length === 0) return p;
          const colorMap = { ...p.colorMap };
          for (const h of hits) colorMap[h.index] = activeColor;
          return { ...p, colorMap };
        })
        : null,
      chainHits.length > 0
        ? (prev) => prev.map((c) => {
          const hits = chainHits.filter(h => h.placementId === c.placementId);
          if (hits.length === 0) return c;
          const colorMap = { ...c.colorMap };
          for (const h of hits) colorMap[h.index] = activeColor;
          return { ...c, colorMap };
        })
        : null,
      null,
      decorTailHits.length > 0
        ? (prev) => prev.map((t) => {
          const hits = decorTailHits.filter(h => h.placementId === t.placementId);
          if (hits.length === 0) return t;
          const colorMap = { ...t.colorMap };
          for (const h of hits) colorMap[h.index] = activeColor;
          return { ...t, colorMap };
        })
        : null,
    );
  }, [beads, drawingControls, pendantPlacements, pendantAnchors, bottomNodes, pendantChains, decorTailPlacements]);

  const handleFloodFill = useCallback((startId: string) => {
    const mirrorId = mirrorMode
      ? mirrorBeadId(startId, gridSize.width, internalTop, internalBottom, edgeExtension.left, edgeExtension.right)
      : null;
    applyUnifiedFloodFill(startId, mirrorId !== startId ? mirrorId : null);
  }, [applyUnifiedFloodFill, mirrorMode, gridSize.width, internalTop, internalBottom, edgeExtension]);

  // Ретроактивная симметризация: дозаполняет отсутствующую зеркальную половину
  // Design Map по текущей геометрии — полезно, если узор начали без Mirror
  // Mode или включили его на середине работы. Уже закрашенные (в т.ч.
  // конфликтующие) зеркальные пары не трогает, см. symmetrize.ts.
  const makeSymmetric = useCallback(() => {
    drawingControls.remapDesignMap(map => fillMissingMirror(
      map,
      id => mirrorBeadId(id, gridSize.width, internalTop, internalBottom, edgeExtension.left, edgeExtension.right),
    ));
  }, [drawingControls, gridSize.width, internalTop, internalBottom, edgeExtension]);

  const handlePendantPaint = useCallback((placementId: string, beadIndex: number) => {
    if (drawingControls.activeTool !== 'flood-fill') {
      pendantControls.paintPendantBead(placementId, beadIndex);
      return;
    }
    const startId = pendantBeadId(placementId, beadIndex);
    let mirrorStartId: string | null = null;
    if (mirrorMode && gridSize.width > 1) {
      const placement = pendantPlacements.find(p => p.placementId === placementId);
      const mirrorCol = placement ? gridSize.width - 1 - placement.col : null;
      const mirrorPlacement = mirrorCol !== null
        ? pendantPlacements.find(p => p.col === mirrorCol)
        : undefined;
      if (mirrorPlacement && mirrorPlacement.placementId !== placementId) {
        mirrorStartId = pendantBeadId(mirrorPlacement.placementId, beadIndex);
      }
    }
    applyUnifiedFloodFill(startId, mirrorStartId);
  }, [drawingControls.activeTool, pendantControls, mirrorMode, gridSize.width, pendantPlacements, applyUnifiedFloodFill]);

  const handleChainPaint = useCallback((placementId: string, beadIndex: number) => {
    if (drawingControls.activeTool !== 'flood-fill') {
      chainControls.paintChainBead(placementId, beadIndex);
      return;
    }
    const startId = chainBeadId(placementId, beadIndex);
    let mirrorStartId: string | null = null;
    if (mirrorMode && gridSize.width > 1) {
      const chain = pendantChains.find(c => c.placementId === placementId);
      if (chain) {
        const mirrorStart = gridSize.width - 1 - chain.endCol;
        const mirrorEnd = gridSize.width - 1 - chain.startCol;
        const mirrorChain = pendantChains.find(c =>
          c.placementId !== placementId && c.startCol === mirrorStart && c.endCol === mirrorEnd);
        if (mirrorChain) mirrorStartId = chainBeadId(mirrorChain.placementId, beadIndex);
      }
    }
    applyUnifiedFloodFill(startId, mirrorStartId);
  }, [drawingControls.activeTool, chainControls, mirrorMode, gridSize.width, pendantChains, applyUnifiedFloodFill]);

  const handleDecorTailPaint = useCallback((placementId: string, beadIndex: number) => {
    if (drawingControls.activeTool !== 'flood-fill') {
      decorTailControls.paintBead(placementId, beadIndex);
      return;
    }
    const startId = decorTailBeadId(placementId, beadIndex);
    let mirrorStartId: string | null = null;
    if (mirrorMode && gridSize.width > 1) {
      const tail = decorTailPlacements.find(t => t.placementId === placementId);
      const mirrorCol = tail ? gridSize.width - 1 - tail.col : null;
      const mirrorTail = mirrorCol !== null
        ? decorTailPlacements.find(t => t.col === mirrorCol)
        : undefined;
      if (mirrorTail && mirrorTail.placementId !== placementId) {
        mirrorStartId = decorTailBeadId(mirrorTail.placementId, beadIndex);
      }
    }
    applyUnifiedFloodFill(startId, mirrorStartId);
  }, [
    drawingControls.activeTool, decorTailControls, mirrorMode, gridSize.width,
    decorTailPlacements, applyUnifiedFloodFill,
  ]);

  // Инструмент 'pendant-chain': клик по узлу нижнего ряда отмечает начало,
  // следующий клик по другому узлу — конец и создаёт цепочку. Повторный клик
  // по той же ноде отменяет незавершённый выбор.
  const handleChainNodeClick = useCallback((col: number) => {
    if (chainPendingStart === null) {
      setChainPendingStart(col);
      return;
    }
    if (col === chainPendingStart) {
      setChainPendingStart(null);
      return;
    }
    chainControls.addChain(chainPendingStart, col);
    setChainPendingStart(null);
  }, [chainPendingStart, chainControls]);

  return {
    ...gridConfig,
    pendantPlacements, setPendantPlacements,
    pendantChains, setPendantChains, chainControls, chainPendingStart, setChainPendingStart,
    decorTailPlacements, setDecorTailPlacements, decorTailControls,
    threads, threadControls, weave,
    activeThreadColor, setActiveThreadColor, activeThreadOpacity, setActiveThreadOpacity,
    beads, drawingControls, pendantControls,
    hoveredCol, setHoveredCol, hoveredRow, setHoveredRow,
    hoveredDecorTailCol, setHoveredDecorTailCol,
    stampPattern, setStampPattern, stampHoverNodeId, setStampHoverNodeId, stampPreviewPatch,
    stampAnchorEdge, toggleStampAnchorEdge,
    canvasSvgRef, rowGaps, bottomNodes, pendantAnchors, decorRowStep, internalTop, internalBottom,
    handleStampSelect, handleStampPlace,
    handleFloodFill, handlePendantPaint, handleChainPaint, handleDecorTailPaint,
    handleChainNodeClick,
    makeSymmetric,
  };
};

export type SilyankaProject = ReturnType<typeof useSilyankaProject>;
