/* src/App.tsx */
import { useEffect } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { usePersistedState } from './hooks/usePersistedState';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { Header } from './components/Editor/Header/Header';
import { BEAD_THEME } from './config/theme';
import { GridConfig } from './types/bead';
import { clampSpan, resolveSpanCount } from './utils/spans';

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

  const beads = useGrid(gridSize, rowSpanOverrides);
  const drawingControls = useDrawing(PALETTE[0], PALETTE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); drawingControls.undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); drawingControls.redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingControls.undo, drawingControls.redo]);

  const updateDimension = (field: 'width' | 'height', delta: number) => {
    setGridSize(prev => ({ ...prev, [field]: Math.max(1, prev[field] + delta) }));
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

  return (
    <main className="editor">
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
        zoom={zoom}
        onZoomChange={updateZoom}
        onUndo={drawingControls.undo}
        onRedo={drawingControls.redo}
        canUndo={drawingControls.canUndo}
        canRedo={drawingControls.canRedo}
      />

      <CanvasView
        beads={beads}
        zoom={zoom}
        topSpan={gridSize.topSpan}
        bottomSpan={gridSize.bottomSpan}
        rowSpanOverrides={rowSpanOverrides}
        onRowSpanChange={updateRowSpan}
        {...drawingControls}
      />
    </main>
  );
}

export default App;