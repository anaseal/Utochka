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

  const addRow = () => setGridSize(prev => ({ ...prev, height: prev.height + 1 }));
  const addCol = () => setGridSize(prev => ({ ...prev, width: prev.width + 1 }));

  return (
    <main className="editor">
      <Header 
        palette={PALETTE}
        activeColor={drawingControls.activeColor}
        setActiveColor={drawingControls.setActiveColor}
      />

      <CanvasView 
        beads={beads} 
        {...drawingControls}
        onAddRow={addRow}
        onAddCol={addCol}
      />
    </main>
  );
}

export default App;