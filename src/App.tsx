/* src/App.tsx */
import { useState, useEffect } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { Header } from './components/Editor/Header/Header';
import { BEAD_THEME } from './config/theme';

const PALETTE = ['#22d3ee', '#e879f9', '#ffffff', '#ff4757', '#2ed573', '#eccc68'];

function App() {
  const [gridSize, setGridSize] = useState({ 
    width: BEAD_THEME.gridDefaults.initialWidth, 
    height: BEAD_THEME.gridDefaults.initialHeight, 
    spacing: BEAD_THEME.gridDefaults.spacing, 
    topSpan: BEAD_THEME.gridDefaults.beadsInSpan,
    bottomSpan: BEAD_THEME.gridDefaults.beadsInSpan
  });
  
  const [zoom, setZoom] = useState(1);

  const beads = useGrid(gridSize);
  const drawingControls = useDrawing(PALETTE[0]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); drawingControls.undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); drawingControls.redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingControls.undo, drawingControls.redo]);

  const updateWidth = (delta: number) => {
    setGridSize(prev => ({ ...prev, width: Math.max(1, prev.width + delta) }));
  };
  
  const updateHeight = (delta: number) => {
    setGridSize(prev => ({ ...prev, height: Math.max(1, prev.height + delta) }));
  };

  const updateTopSpan = (delta: number) => {
    setGridSize(prev => ({ 
      ...prev, 
      topSpan: Math.max(3, Math.min(10, prev.topSpan + delta)) 
    }));
  };

  const updateBottomSpan = (delta: number) => {
    setGridSize(prev => ({ 
      ...prev, 
      bottomSpan: Math.max(3, Math.min(10, prev.bottomSpan + delta)) 
    }));
  };

  const updateZoom = (delta: number) => {
    setZoom(prev => Math.min(3, Math.max(0.25, prev + delta)));
  };

  return (
    <main className="editor">
      <Header 
        palette={PALETTE}
        activeColor={drawingControls.activeColor}
        setActiveColor={drawingControls.setActiveColor}
        gridWidth={gridSize.width} // Убеждаемся, что передаем width как gridWidth
        gridHeight={gridSize.height} // Убеждаемся, что передаем height как gridHeight
        topSpan={gridSize.topSpan}
        bottomSpan={gridSize.bottomSpan}
        onWidthChange={updateWidth}
        onHeightChange={updateHeight}
        onTopSpanChange={updateTopSpan}
        onBottomSpanChange={updateBottomSpan}
        zoom={zoom}
        onZoomChange={updateZoom}
        onZoomReset={() => setZoom(1)}
        onUndo={drawingControls.undo}
        onRedo={drawingControls.redo}
        canUndo={drawingControls.canUndo}
        canRedo={drawingControls.canRedo}
      />

      <CanvasView 
        beads={beads} 
        zoom={zoom}
        {...drawingControls}
      />
    </main>
  );
}

export default App;