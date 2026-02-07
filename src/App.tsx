/* src/App.tsx */
import { useState } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { Header } from './components/Editor/Header/Header';

const PALETTE = ['#22d3ee', '#e879f9', '#ffffff', '#ff4757', '#2ed573', '#eccc68'];

function App() {
  const [gridSize, setGridSize] = useState({ 
columns: 10, 
    rows: 6, 
    spacing: 65, 
    topSpan: 3,    // Общее количество бусин в верхних гранях
    bottomSpan: 3  // Общее количество бусин в нижних гранях
  });
  
  // Состояние масштаба (1 = 100%)
  const [zoom, setZoom] = useState(1);

  const beads = useGrid(gridSize);
  const drawingControls = useDrawing(PALETTE[0]);

  const updateWidth = (delta: number) => {
    setGridSize(prev => ({ ...prev, width: Math.max(1, prev.columns + delta) }));
  };
  
  const updateHeight = (delta: number) => {
    setGridSize(prev => ({ ...prev, height: Math.max(1, prev.rows + delta) }));
  };

  // Функции управления количеством бусин в гранях (от 3 до 10)
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

  // Функции управления зумом
  const updateZoom = (delta: number) => {
    setZoom(prev => Math.min(3, Math.max(0.25, prev + delta)));
  };

  return (
    <main className="editor">
      <Header 
        palette={PALETTE}
        activeColor={drawingControls.activeColor}
        setActiveColor={drawingControls.setActiveColor}
        gridWidth={gridSize.columns}
        gridHeight={gridSize.rows}
        topSpan={gridSize.topSpan}
        bottomSpan={gridSize.bottomSpan}
        onWidthChange={updateWidth}
        onHeightChange={updateHeight}
        onTopSpanChange={updateTopSpan}
        onBottomSpanChange={updateBottomSpan}
        zoom={zoom}
        onZoomChange={updateZoom}
        onZoomReset={() => setZoom(1)}
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