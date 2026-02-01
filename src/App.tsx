import { useState } from 'react';
import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { CanvasView } from './components/Editor/CanvasView';

const PALETTE = ['#22d3ee', '#e879f9', '#ffffff', '#ff4757', '#2ed573', '#eccc68'];

function App() {
  // Инициализируем состояние размерами из ваших настроек
  const [gridSize, setGridSize] = useState({ 
    width: 8, 
    height: 10, 
    spacing: 40, 
    beadsInSpan: 6 
  });

  const beads = useGrid(gridSize);
  const drawingControls = useDrawing(PALETTE[0]);

  const addRow = () => setGridSize(prev => ({ ...prev, height: prev.height + 1 }));
  const addCol = () => setGridSize(prev => ({ ...prev, width: prev.width + 1 }));

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-8 p-10 select-none">
      <nav className="flex items-center gap-6 p-4 bg-slate-800 rounded-[2rem] border border-slate-700 shadow-xl">
        <div className="flex gap-3">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => drawingControls.setActiveColor(color)}
              className={`w-10 h-10 rounded-full transition-all border-2 ${
                drawingControls.activeColor === color ? 'border-white ring-4 ring-white/10 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </nav>

      {/* Контейнер для сетки и кнопок расширения */}
      <div className="relative flex items-center gap-6">
        <div className="flex flex-col items-center gap-6">
          <CanvasView 
            beads={beads} 
            {...drawingControls} 
          />
          
          {/* Кнопка добавления ряда (снизу) */}
          <button
            onClick={addRow}
            className="group flex items-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-all shadow-lg active:scale-95"
          >
            <span className="text-xl font-bold">+</span>
            <span className="text-xs uppercase tracking-widest font-black">Add Row</span>
          </button>
        </div>

        {/* Кнопка добавления колонки (справа) */}
        <button
          onClick={addCol}
          className="group flex flex-col items-center gap-3 px-4 py-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-all shadow-lg active:scale-95"
        >
          <span className="text-xl font-bold">+</span>
          <span className="text-[10px] uppercase tracking-widest font-black [writing-mode:vertical-lr]">Add Column</span>
        </button>
      </div>

      <div className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
        Current Grid: {gridSize.width} COL x {gridSize.height} ROW
      </div>
    </div>
  );
}

export default App;