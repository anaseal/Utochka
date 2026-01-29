import { useState, useMemo, useCallback } from 'react';
import { generateSilyankaGrid } from './utils/generator';
import { BeadView } from './components/BeadView';

const PALETTE = ['#22d3ee', '#e879f9', '#ffffff', '#ff4757', '#2ed573', '#eccc68'];

function App() {
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [designMap, setDesignMap] = useState<Map<string, string>>(new Map());
  
  // ФТ: Стейт для отслеживания нажатия мыши
  const [isDrawing, setIsDrawing] = useState(false);

  const GRID_CONFIG = useMemo(() => ({
    width: 8, height: 10, spacing: 40, beadsInSpan: 3
  }), []);

  const beads = useMemo(() => {
    return generateSilyankaGrid(GRID_CONFIG.width, GRID_CONFIG.height, GRID_CONFIG.spacing, GRID_CONFIG.beadsInSpan);
  }, [GRID_CONFIG]);

  // Функция покраски одной бисерины (вынесена для переиспользования)
  const paintBead = useCallback((id: string) => {
    setDesignMap(prev => {
      if (prev.get(id) === activeColor) return prev; // Оптимизация: не обновляем, если цвет тот же
      const next = new Map(prev);
      next.set(id, activeColor);
      return next;
    });
  }, [activeColor]);

  const colorStats = useMemo(() => {
    const counts: Record<string, number> = {};
    beads.forEach((bead) => {
      const finalColor = designMap.get(bead.id) || (bead.type === 'NODE' ? '#22d3ee' : '#e879f9');
      counts[finalColor] = (counts[finalColor] || 0) + 1;
    });
    return counts;
  }, [beads, designMap]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-8 p-10 select-none">
      
      {/* Палитра */}
      <nav className="flex items-center gap-6 p-4 bg-slate-800 rounded-[2rem] border border-slate-700 shadow-xl">
        <div className="flex gap-3">
          {PALETTE.map(color => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`w-10 h-10 rounded-full transition-all border-2 ${
                activeColor === color ? 'border-white ring-4 ring-white/10 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </nav>

      {/* Холст с обработчиками мыши */}
      <main 
        className="relative bg-slate-800 rounded-[2.5rem] border border-slate-700 shadow-inner overflow-hidden w-full max-w-4xl aspect-[16/10] flex items-center justify-center cursor-crosshair"
        onMouseDown={() => setIsDrawing(true)}
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)} // Прерываем рисование, если ушли с холста
      >
        <svg viewBox="0 0 800 500" className="w-full h-full p-8">
          <g>
            {beads.map((bead) => (
              <BeadView 
                key={bead.id} 
                bead={{
                  ...bead,
                  color: designMap.get(bead.id) || (bead.type === 'NODE' ? '#22d3ee' : '#e879f9')
                }} 
                // Красим при обычном клике
                onClick={() => paintBead(bead.id)}
                // Красим при "прокатывании" зажатой мышью
                onMouseEnter={() => isDrawing && paintBead(bead.id)}
              />
            ))}
          </g>
        </svg>

        {/* Статистика */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-2 items-end pointer-events-none">
          {Object.entries(colorStats).map(([color, count]) => (
            <StatBadge key={color} label={color} count={count} color={color} />
          ))}
        </div>
      </main>

      <footer className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">
        Hold mouse button and drag to paint like a brush
      </footer>
    </div>
  );
}

const StatBadge = ({ label, count, color }: { label: string, count: number, color: string }) => (
  <div className="px-4 py-2 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 flex items-center gap-3 shadow-2xl">
    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
    <span className="text-xs font-black text-white">{count}</span>
  </div>
);

export default App;