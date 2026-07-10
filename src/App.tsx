/* src/App.tsx */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { usePendants } from './hooks/usePendants';
import { usePersistedState } from './hooks/usePersistedState';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { Header } from './components/Editor/Header/Header';
import { PendantsSidebar } from './components/Sidebar/PendantsSidebar';
import { BEAD_THEME } from './config/theme';
import { BottomEdgeDecor, GridConfig } from './types/bead';
import { PendantPlacement } from './types/pendant';
import { PENDANT_TEMPLATES, PENDANT_TEMPLATES_BY_ID } from './data/pendantTemplates';
import { clampSpan, resolveSpanCount } from './utils/spans';
import { shiftDesignMapColumns } from './utils/regrid';
import { mirrorBeadId } from './utils/mirror';

const PALETTE = ['#ff4757', '#ffd32a', '#22d3ee', '#e879f9', '#ffffff'] as const;

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

const isZoom = (v: unknown): v is number =>
  typeof v === 'number' && v >= 0.25 && v <= 3;

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

function App() {
  const [gridSize, setGridSize] = usePersistedState<GridConfig>('silyanka:gridSize', {
    width: BEAD_THEME.gridDefaults.initialWidth,
    height: BEAD_THEME.gridDefaults.initialHeight,
    spacing: BEAD_THEME.gridDefaults.spacing,
    topSpan: BEAD_THEME.gridDefaults.beadsInSpan,
    bottomSpan: BEAD_THEME.gridDefaults.beadsInSpan,
  }, isGridConfig);

  const [zoom, setZoom] = usePersistedState<number>('silyanka:zoom', 1, isZoom);
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
  const drawingControls = useDrawing(PALETTE[0], PALETTE);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); drawingControls.undo(); }
      if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { e.preventDefault(); drawingControls.redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingControls.undo, drawingControls.redo]);

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

  const updateZoom = (delta: number) => {
    setZoom(prev => Math.min(3, Math.max(0.25, prev + delta)));
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

  const setZoomAbsolute = (v: number) => {
    setZoom(Math.min(3, Math.max(0.25, v)));
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

  const handleFloodFill = useCallback((startId: string) => {
    const mirrorId = mirrorMode
      ? mirrorBeadId(startId, gridSize.width, internalTop, internalBottom)
      : null;
    drawingControls.floodFillAt(startId, beads, mirrorId !== startId ? mirrorId : null);
  }, [drawingControls.floodFillAt, beads, mirrorMode, gridSize.width, internalTop, internalBottom]);

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

  return (
    <main className={`editor${sidebarOpen ? ' editor--sidebar-open' : ''}`}>
      <Header
        palette={PALETTE}
        activeColor={drawingControls.activeColor}
        setActiveColor={drawingControls.setActiveColor}
        activeTool={drawingControls.activeTool}
        setActiveTool={drawingControls.setActiveTool}
        recentColors={drawingControls.recentColors}
        commitRecentColor={drawingControls.commitRecentColor}
        onClearAll={drawingControls.clearAll}
        gridWidth={gridSize.width}
        gridHeight={gridSize.height}
        topSpan={gridSize.topSpan}
        bottomSpan={gridSize.bottomSpan}
        onWidthChange={(delta) => updateDimension('width', delta)}
        onHeightChange={(delta) => updateDimension('height', delta)}
        onTopSpanChange={updateTopSpan}
        onBottomSpanChange={updateBottomSpan}
        onTopEdgeReset={() => resetEdge('top')}
        onBottomEdgeReset={() => resetEdge('bottom')}
        mirrorMode={mirrorMode}
        setMirrorMode={setMirrorMode}
        zoom={zoom}
        onZoomChange={updateZoom}
        onUndo={drawingControls.undo}
        onRedo={drawingControls.redo}
        canUndo={drawingControls.canUndo}
        canRedo={drawingControls.canRedo}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onSetWidth={setWidthAbsolute}
        onSetHeight={setHeightAbsolute}
        onSetTopSpan={setTopSpanAbsolute}
        onSetBottomSpan={setBottomSpanAbsolute}
        onSetZoom={setZoomAbsolute}
      />

      <CanvasView
        beads={beads}
        zoom={zoom}
        onZoomChange={updateZoom}
        topSpan={gridSize.topSpan}
        bottomSpan={gridSize.bottomSpan}
        rowSpanOverrides={rowSpanOverrides}
        onRowSpanChange={updateRowSpan}
        hoveredRow={hoveredRow}
        mirrorMode={mirrorMode}
        width={gridSize.width}
        internalTop={internalTop}
        internalBottom={internalBottom}
        pendantPlacements={pendantPlacements}
        pendantTemplates={PENDANT_TEMPLATES_BY_ID}
        bottomNodes={bottomNodes}
        hoveredCol={hoveredCol}
        onPaintPendantBead={pendantControls.paintPendantBead}
        onRemovePlacement={pendantControls.removePlacement}
        canvasSvgRef={canvasSvgRef}
        onFloodFill={handleFloodFill}
        bottomEdgeEnabled={bottomEdgeDecor.enabled}
        bottomEdgeSpan={bottomEdgeDecor.span}
        onBottomEdgeSpanChange={updateBottomEdgeSpan}
        {...drawingControls}
      />

      <PendantsSidebar
        open={sidebarOpen}
        templates={PENDANT_TEMPLATES}
        placements={pendantPlacements}
        onHoveredColChange={setHoveredCol}
        onAddPlacement={pendantControls.addPlacement}
        onClearAll={pendantControls.clearAllPlacements}
        canvasSvgRef={canvasSvgRef}
        bottomNodes={bottomNodes}
        zoom={zoom}
        decorBands={decorBands}
        rowGaps={rowGaps}
        onDecorDrop={handleDecorDrop}
        onDecorCount={updateDecorBand}
        onClearDecor={handleClearDecor}
        onHoveredRowChange={setHoveredRow}
        bottomEdgeEnabled={bottomEdgeDecor.enabled}
        onBottomEdgeToggle={toggleBottomEdgeEnabled}
      />
    </main>
  );
}

export default App;