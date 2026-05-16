/* src/App.tsx */
import { useEffect, useRef, useState } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { usePendants } from './hooks/usePendants';
import { usePersistedState } from './hooks/usePersistedState';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { Header } from './components/Editor/Header/Header';
import { PendantsSidebar } from './components/Sidebar/PendantsSidebar';
import { BEAD_THEME } from './config/theme';
import { GridConfig } from './types/bead';
import { PendantPlacement } from './types/pendant';
import { PENDANT_TEMPLATES, PENDANT_TEMPLATES_BY_ID } from './data/pendantTemplates';
import { clampSpan, resolveSpanCount } from './utils/spans';
import { shiftDesignMapColumns } from './utils/regrid';

const PALETTE = ['#ff4757', '#ffd32a', '#22d3ee', '#e879f9', '#ffffff'] as const;

const isGridConfig = (v: unknown): v is GridConfig =>
  typeof v === 'object' && v !== null &&
  typeof (v as GridConfig).width === 'number' &&
  typeof (v as GridConfig).height === 'number' &&
  typeof (v as GridConfig).spacing === 'number' &&
  typeof (v as GridConfig).topSpan === 'number' &&
  typeof (v as GridConfig).bottomSpan === 'number';

const isZoom = (v: unknown): v is number =>
  typeof v === 'number' && v >= 0.25 && v <= 3;

const isRowSpanOverrides = (v: unknown): v is Record<number, number> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(n => typeof n === 'number');
};

// decorBands имеет ту же форму, что и rowSpanOverrides: Record<row, count>.
const isDecorBands = isRowSpanOverrides;

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

  const [pendantPlacements, setPendantPlacements] = usePersistedState<PendantPlacement[]>(
    'silyanka:pendantPlacements', [], isPendantPlacements,
  );

  const beads = useGrid(gridSize, rowSpanOverrides, decorBands);
  const drawingControls = useDrawing(PALETTE[0], PALETTE);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);

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
    setGridSize(prev => ({ ...prev, topSpan: clampSpan(prev.topSpan + delta) }));
  };

  const updateBottomSpan = (delta: number) => {
    setGridSize(prev => ({ ...prev, bottomSpan: clampSpan(prev.bottomSpan + delta) }));
  };

  const updateZoom = (delta: number) => {
    setZoom(prev => Math.min(3, Math.max(0.25, prev + delta)));
  };

  const updateRowSpan = (spanRowIndex: number, delta: number) => {
    setRowSpanOverrides(prev => {
      const current = resolveSpanCount(spanRowIndex, gridSize.topSpan, gridSize.bottomSpan, prev);
      return { ...prev, [spanRowIndex]: clampSpan(current + delta) };
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
      />

      <CanvasView
        beads={beads}
        zoom={zoom}
        onZoomChange={updateZoom}
        topSpan={gridSize.topSpan}
        bottomSpan={gridSize.bottomSpan}
        rowSpanOverrides={rowSpanOverrides}
        onRowSpanChange={updateRowSpan}
        decorBands={decorBands}
        onDecorChange={updateDecorBand}
        mirrorMode={mirrorMode}
        width={gridSize.width}
        internalTop={internalTop}
        pendantPlacements={pendantPlacements}
        pendantTemplates={PENDANT_TEMPLATES_BY_ID}
        bottomNodes={bottomNodes}
        hoveredCol={hoveredCol}
        onPaintPendantBead={pendantControls.paintPendantBead}
        onRemovePlacement={pendantControls.removePlacement}
        canvasSvgRef={canvasSvgRef}
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
      />
    </main>
  );
}

export default App;