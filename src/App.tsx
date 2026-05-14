/* src/App.tsx */
import { useState, useEffect } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { Header } from './components/Editor/Header/Header';
import { BEAD_THEME } from './config/theme';
import { clampSpan, resolveSpanCount } from './utils/spans';

const PALETTE = ['#ff4757', '#ffd32a', '#22d3ee', '#e879f9', '#ffffff'] as const;

function App() {
  const [gridSize, setGridSize] = useState({ 
    width: BEAD_THEME.gridDefaults.initialWidth, 
    height: BEAD_THEME.gridDefaults.initialHeight, 
    spacing: BEAD_THEME.gridDefaults.spacing, 
    topSpan: BEAD_THEME.gridDefaults.beadsInSpan,
    bottomSpan: BEAD_THEME.gridDefaults.beadsInSpan
  });
  
  const [zoom, setZoom] = useState(1);
  const [rowSpanOverrides, setRowSpanOverrides] = useState<Record<number, number>>({});

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