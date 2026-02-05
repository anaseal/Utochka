/* src/App.tsx */
import { useState } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { CanvasView } from './components/Editor/CanvasView';
import { Header } from './components/Editor/Header';

const PALETTE = ['#22d3ee', '#e879f9', '#ffffff', '#ff4757', '#2ed573', '#eccc68'];

function App() {
  const [gridSize, setGridSize] = useState({ 
    width: 10, 
    height: 6, 
    spacing: 65, 
    beadsInSpan: 3 
  });

  const beads = useGrid(gridSize);
  const drawingControls = useDrawing(PALETTE[0]);

  // Функции изменения размера с защитой (минимум 1)
  const updateWidth = (delta: number) => {
    setGridSize(prev => ({ ...prev, width: Math.max(1, prev.width + delta) }));
  };
  
  const updateHeight = (delta: number) => {
    setGridSize(prev => ({ ...prev, height: Math.max(1, prev.height + delta) }));
  };

  return (
    <main className="editor">
      <Header 
        palette={PALETTE}
        activeColor={drawingControls.activeColor}
        setActiveColor={drawingControls.setActiveColor}
        gridWidth={gridSize.width}
        gridHeight={gridSize.height}
        onWidthChange={updateWidth}
        onHeightChange={updateHeight}
      />

      <CanvasView 
        beads={beads} 
        {...drawingControls}
      />
    </main>
  );
}

export default App;