import { useCallback, useMemo, useRef, useState } from 'react';
import { useGrid } from './useGrid';
import { useDrawing } from './useDrawing';
import { usePendants } from './usePendants';
import { usePersistedState } from './usePersistedState';
import { BEAD_THEME } from '../config/theme';
import { BottomEdgeDecor, GridConfig } from '../types/bead';
import { PendantPlacement } from '../types/pendant';
import { PENDANT_TEMPLATES_BY_ID } from '../data/pendantTemplates';
import { clampSpan, resolveSpanCount } from '../utils/spans';
import { shiftDesignMapColumns } from '../utils/regrid';
import { mirrorBeadId } from '../utils/mirror';
import { computeUnifiedFloodFill, pendantBeadId } from '../utils/floodFill';
import { StampPattern, StampContext, captureStampPattern, applyStampPattern } from '../utils/stamp';

const isGridConfig = (v: unknown): v is GridConfig => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.width !== 'number') return false;
  if (typeof obj.height !== 'number') return false;
  if (typeof obj.spacing !== 'number') return false;
  if (typeof obj.topSpan !== 'number') return false;
  if (typeof obj.bottomSpan !== 'number') return false;
  return true;
};

const isBottomEdgeDecor = (v: unknown): v is BottomEdgeDecor =>
  typeof v === 'object' && v !== null &&
  typeof (v as BottomEdgeDecor).enabled === 'boolean' &&
  typeof (v as BottomEdgeDecor).span === 'number';

const isRowSpanOverrides = (v: unknown): v is Record<number, number> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(n => typeof n === 'number');
};

// decorBands имеет ту же форму, что и rowSpanOverrides: Record<row, count>.
const isDecorBands = isRowSpanOverrides;

// Убирает per-row override'ы, совпавшие с глобальным дефолтом.
// Иначе такой override «протухает»: resolveSpanCount отдаёт ему приоритет
// через `??`, и общий контрол TOP/BOTTOM EDGE перестаёт двигать этот ряд.
const pruneRedundantOverrides = (
  overrides: Record<number, number>,
  topSpan: number,
  bottomSpan: number,
): Record<number, number> => {
  const next: Record<number, number> = {};
  let changed = false;
  for (const [k, v] of Object.entries(overrides)) {
    const r = Number(k);
    if (v === resolveSpanCount(r, topSpan, bottomSpan, {})) {
      changed = true;
      continue;
    }
    next[r] = v;
  }
  return changed ? next : overrides;
};

const isPendantPlacements = (v: unknown): v is PendantPlacement[] =>
  Array.isArray(v) && v.every(p =>
    typeof p === 'object' && p !== null &&
    typeof p.placementId === 'string' &&
    typeof p.templateId === 'string' &&
    typeof p.col === 'number' &&
    typeof p.colorMap === 'object' && p.colorMap !== null);

// Всё силяночное состояние и обработчики, вынесенные из App.tsx, чтобы
// хостить вторую независимую технику (крестик) без дублирования ~400 строк.
export const useSilyankaProject = (palette: readonly string[]) => {
  const [gridSize, setGridSize] = usePersistedState<GridConfig>('silyanka:gridSize', {
    width: BEAD_THEME.gridDefaults.initialWidth,
    height: BEAD_THEME.gridDefaults.initialHeight,
    spacing: BEAD_THEME.gridDefaults.spacing,
    topSpan: BEAD_THEME.gridDefaults.beadsInSpan,
    bottomSpan: BEAD_THEME.gridDefaults.beadsInSpan,
  }, isGridConfig);

  const [rowSpanOverrides, setRowSpanOverrides] = usePersistedState<Record<number, number>>(
    'silyanka:rowSpanOverrides', {}, isRowSpanOverrides,
  );
  const [mirrorMode, setMirrorMode] = usePersistedState<boolean>(
    'silyanka:mirrorMode', false, (v): v is boolean => typeof v === 'boolean',
  );
  const [decorBands, setDecorBands] = usePersistedState<Record<number, number>>(
    'silyanka:decorBands', {}, isDecorBands,
  );
  const [bottomEdgeDecor, setBottomEdgeDecor] = usePersistedState<BottomEdgeDecor>(
    'silyanka:bottomEdgeDecor',
    { enabled: false, span: BEAD_THEME.gridDefaults.beadsInSpan },
    isBottomEdgeDecor,
  );

  const [pendantPlacements, setPendantPlacements] = usePersistedState<PendantPlacement[]>(
    'silyanka:pendantPlacements', [], isPendantPlacements,
  );

  const beads = useGrid(gridSize, rowSpanOverrides, decorBands, bottomEdgeDecor);
  const drawingControls = useDrawing(palette[0], palette, pendantPlacements, setPendantPlacements, 'silyanka');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [stampPattern, setStampPattern] = useState<StampPattern | null>(null);
  const [stampHoverNodeId, setStampHoverNodeId] = useState<string | null>(null);
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

  const bottomNodes = beads.filter(
    b => b.type === 'NODE' && b.logicalIndex.row === 2 * gridSize.height,
  );

  const internalTop = Math.max(
    0,
    resolveSpanCount(-1, gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides) - 2,
  );

  const internalBottom = Math.max(0, bottomEdgeDecor.span - 2);

  // Контекст трансляции id для штампа — та же геометрия, что видит generator.ts.
  const stampCtx = useMemo<StampContext>(() => ({
    topSpan: gridSize.topSpan,
    bottomSpan: gridSize.bottomSpan,
    rowSpanOverrides,
    decorBands,
    beadIds: new Set(beads.map(b => b.id)),
  }), [gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides, decorBands, beads]);

  const stampPreviewIds = useMemo<Set<string> | null>(() => {
    if (!stampPattern || !stampHoverNodeId) return null;
    const targetBead = beads.find(b => b.id === stampHoverNodeId);
    if (!targetBead) return null;
    const patch = applyStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx);
    return new Set(Object.keys(patch));
  }, [stampPattern, stampHoverNodeId, beads, stampCtx]);

  const handleStampSelect = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const pattern = captureStampPattern(ids, beads, drawingControls.designMap);
    if (pattern.entries.length === 0) return;
    setStampPattern(pattern);
    setStampHoverNodeId(null);
  }, [beads, drawingControls.designMap]);

  const handleStampPlace = useCallback((nodeId: string) => {
    if (!stampPattern) return;
    const targetBead = beads.find(b => b.id === nodeId);
    if (!targetBead) return;
    const patch = applyStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx);
    if (Object.keys(patch).length === 0) return;

    drawingControls.remapDesignMap(prev => {
      const next = { ...prev, ...patch };
      if (mirrorMode) {
        for (const [id, color] of Object.entries(patch)) {
          const m = mirrorBeadId(id, gridSize.width, internalTop, internalBottom);
          if (m !== null && m !== id && stampCtx.beadIds.has(m)) next[m] = color;
        }
      }
      return next;
    });
  }, [stampPattern, beads, stampCtx, drawingControls, mirrorMode, gridSize.width, internalTop, internalBottom]);

  const updateDimension = (field: 'width' | 'height', delta: number) => {
    if (field === 'width' && mirrorMode) {
      // ±2: добавляем/убираем по колонке с каждой стороны, рисунок остаётся по центру
      const newW = gridSize.width + delta * 2;
      if (newW >= 1 && newW !== gridSize.width) {
        drawingControls.remapDesignMap(map =>
          shiftDesignMapColumns(map, delta, newW),
        );
        // Подвески сдвигаем вместе с рисунком, иначе их col отвяжется от нод.
        setPendantPlacements(prev => prev
          .map(p => ({ ...p, col: p.col + delta }))
          .filter(p => p.col >= 0 && p.col < newW));
        setGridSize(prev => ({ ...prev, width: newW }));
      }
      return;
    }
    if (field === 'width') {
      const newW = Math.max(1, gridSize.width + delta);
      // При сужении сетки убираем подвески с исчезнувших колонок.
      if (newW < gridSize.width) {
        setPendantPlacements(prev => prev.filter(p => p.col < newW));
      }
      setGridSize(prev => ({ ...prev, width: newW }));
      return;
    }
    const newH = Math.max(1, gridSize.height + delta);
    // При уменьшении высоты убираем декор-полосы с исчезнувших рядов.
    if (newH < gridSize.height) {
      setDecorBands(prev => {
        const next: Record<number, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (Number(k) < 2 * newH) next[Number(k)] = v;
        }
        return next;
      });
    }
    setGridSize(prev => ({ ...prev, height: newH }));
  };

  const updateTopSpan = (delta: number) => {
    const newTop = clampSpan(gridSize.topSpan + delta);
    if (newTop === gridSize.topSpan) return;
    setGridSize(prev => ({ ...prev, topSpan: newTop }));
    setRowSpanOverrides(prev => pruneRedundantOverrides(prev, newTop, gridSize.bottomSpan));
  };

  const updateBottomSpan = (delta: number) => {
    const newBottom = clampSpan(gridSize.bottomSpan + delta);
    if (newBottom === gridSize.bottomSpan) return;
    setGridSize(prev => ({ ...prev, bottomSpan: newBottom }));
    setRowSpanOverrides(prev => pruneRedundantOverrides(prev, gridSize.topSpan, newBottom));
  };

  const updateSpacing = (delta: number) => {
    const { minSpacing, maxSpacing } = BEAD_THEME.constraints;
    setGridSize(prev => ({
      ...prev,
      spacing: Math.min(maxSpacing, Math.max(minSpacing, prev.spacing + delta)),
    }));
  };

  const setWidthAbsolute = (v: number) => {
    const newW = Math.max(1, Math.round(v));
    if (newW === gridSize.width) return;
    setPendantPlacements(prev => prev.filter(p => p.col < newW));
    setGridSize(prev => ({ ...prev, width: newW }));
  };

  const setHeightAbsolute = (v: number) => {
    const newH = Math.max(1, Math.round(v));
    if (newH === gridSize.height) return;
    if (newH < gridSize.height) {
      setDecorBands(prev => {
        const next: Record<number, number> = {};
        for (const [k, val] of Object.entries(prev)) {
          if (Number(k) < 2 * newH) next[Number(k)] = val;
        }
        return next;
      });
    }
    setGridSize(prev => ({ ...prev, height: newH }));
  };

  const setTopSpanAbsolute = (v: number) => {
    const newTop = clampSpan(Math.round(v));
    if (newTop === gridSize.topSpan) return;
    setGridSize(prev => ({ ...prev, topSpan: newTop }));
    setRowSpanOverrides(prev => pruneRedundantOverrides(prev, newTop, gridSize.bottomSpan));
  };

  const setBottomSpanAbsolute = (v: number) => {
    const newBottom = clampSpan(Math.round(v));
    if (newBottom === gridSize.bottomSpan) return;
    setGridSize(prev => ({ ...prev, bottomSpan: newBottom }));
    setRowSpanOverrides(prev => pruneRedundantOverrides(prev, gridSize.topSpan, newBottom));
  };

  const setSpacingAbsolute = (v: number) => {
    const { minSpacing, maxSpacing } = BEAD_THEME.constraints;
    setGridSize(prev => ({
      ...prev,
      spacing: Math.min(maxSpacing, Math.max(minSpacing, Math.round(v))),
    }));
  };

  const toggleBottomEdgeEnabled = () => {
    setBottomEdgeDecor(prev => {
      if (!prev.enabled && pendantPlacements.length > 0) return prev;
      return { ...prev, enabled: !prev.enabled };
    });
  };

  const updateBottomEdgeSpan = (delta: number) => {
    setBottomEdgeDecor(prev => ({ ...prev, span: clampSpan(prev.span + delta) }));
  };

  const updateRowSpan = (spanRowIndex: number, delta: number) => {
    setRowSpanOverrides(prev => {
      const current = resolveSpanCount(spanRowIndex, gridSize.topSpan, gridSize.bottomSpan, prev);
      const newVal = clampSpan(current + delta);
      if (newVal === current) return prev;
      const globalDefault = resolveSpanCount(spanRowIndex, gridSize.topSpan, gridSize.bottomSpan, {});
      if (newVal === globalDefault) {
        const next = { ...prev };
        delete next[spanRowIndex];
        return next;
      }
      return { ...prev, [spanRowIndex]: newVal };
    });
  };

  // Промежуточный декор: ± меняет число рядов полосы между узловым рядом r и r+1.
  // 0 (ниже minRows) — полоса удаляется.
  const updateDecorBand = (r: number, delta: number) => {
    setDecorBands(prev => {
      const current = prev[r] ?? 0;
      const next = current + delta;
      const copy = { ...prev };
      if (next < BEAD_THEME.decorDefaults.minRows) {
        delete copy[r];
      } else {
        copy[r] = Math.min(next, BEAD_THEME.decorDefaults.maxRows);
      }
      return copy;
    });
  };

  const handleDecorDrop = (nodeRow: number) => {
    setDecorBands(prev => {
      const copy = { ...prev };
      if ((copy[nodeRow] ?? 0) > 0) {
        delete copy[nodeRow];
      } else {
        copy[nodeRow] = BEAD_THEME.decorDefaults.minRows;
      }
      return copy;
    });
  };

  const handleClearDecor = () => {
    setDecorBands({});
  };

  // Заливка — единый граф сетки и подвесок: подвеска соединена со своей
  // якорной нодой, поэтому цвет может «перетекать» между сеткой и декором.
  const applyUnifiedFloodFill = useCallback((startId: string, mirrorStartId: string | null) => {
    const args = [
      beads, drawingControls.designMap, drawingControls.activeColor,
      pendantPlacements, PENDANT_TEMPLATES_BY_ID, bottomNodes,
    ] as const;
    const r1 = computeUnifiedFloodFill(startId, ...args);
    const r2 = mirrorStartId ? computeUnifiedFloodFill(mirrorStartId, ...args) : { gridIds: [], pendantHits: [] };

    const gridIds = [...new Set([...r1.gridIds, ...r2.gridIds])];
    const pendantHits = [...r1.pendantHits, ...r2.pendantHits];
    if (gridIds.length === 0 && pendantHits.length === 0) return;

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
    );
  }, [beads, drawingControls, pendantPlacements, bottomNodes]);

  const handleFloodFill = useCallback((startId: string) => {
    const mirrorId = mirrorMode
      ? mirrorBeadId(startId, gridSize.width, internalTop, internalBottom)
      : null;
    applyUnifiedFloodFill(startId, mirrorId !== startId ? mirrorId : null);
  }, [applyUnifiedFloodFill, mirrorMode, gridSize.width, internalTop, internalBottom]);

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

  const resetEdge = (edge: 'top' | 'bottom') => {
    const isTop = edge === 'top';
    setGridSize(prev => ({
      ...prev,
      [isTop ? 'topSpan' : 'bottomSpan']: BEAD_THEME.gridDefaults.beadsInSpan,
    }));
    setRowSpanOverrides(prev => {
      const next: Record<number, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        const isEvenRow = Number(k) % 2 === 0;
        const belongsToEdge = isTop ? !isEvenRow : isEvenRow;
        if (!belongsToEdge) next[Number(k)] = v;
      }
      return next;
    });
  };

  return {
    gridSize, rowSpanOverrides, mirrorMode, setMirrorMode, decorBands, bottomEdgeDecor,
    pendantPlacements, setPendantPlacements,
    beads, drawingControls, pendantControls,
    sidebarOpen, setSidebarOpen, hoveredCol, setHoveredCol, hoveredRow, setHoveredRow,
    stampPattern, setStampPattern, stampHoverNodeId, setStampHoverNodeId, stampPreviewIds,
    canvasSvgRef, rowGaps, bottomNodes, internalTop, internalBottom,
    handleStampSelect, handleStampPlace,
    updateDimension, updateTopSpan, updateBottomSpan, updateSpacing,
    setWidthAbsolute, setHeightAbsolute, setTopSpanAbsolute, setBottomSpanAbsolute, setSpacingAbsolute,
    toggleBottomEdgeEnabled, updateBottomEdgeSpan, updateRowSpan,
    updateDecorBand, handleDecorDrop, handleClearDecor,
    handleFloodFill, handlePendantPaint, resetEdge,
  };
};

export type SilyankaProject = ReturnType<typeof useSilyankaProject>;
