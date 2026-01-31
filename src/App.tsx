import { useGrid } from './hooks/useGrid';
import { useDrawing } from './hooks/useDrawing';
import { CanvasView } from './components/Editor/CanvasView';

const PALETTE = ['#22d3ee', '#e879f9', '#ffffff', '#ff4757', '#2ed573', '#eccc68'];
const GRID_CONFIG = { width: 8, height: 10, spacing: 40, beadsInSpan: 3 };

function App() {
  const beads = useGrid(GRID_CONFIG);
  const drawingControls = useDrawing(PALETTE[0]);

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

      <CanvasView 
        beads={beads} 
        {...drawingControls} 
      />

      <footer className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">
        Hold mouse button and drag to paint like a brush
      </footer>
    </div>
  );
}

export default App;