import { useMemo } from 'react';
import { Bead } from '../../types/bead';
import { BeadView } from '../BeadView';

interface CanvasViewProps {
  beads: Bead[];
  designMap: Map<string, string>;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  onAddRow: () => void;
  onAddCol: () => void;
}

export const CanvasView = ({
  beads,
  designMap,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  onAddRow,
  onAddCol
}: CanvasViewProps) => {
  
  const dim = useMemo(() => {
    if (beads.length === 0) return { w: 100, h: 100 };
    return {
      w: Math.max(...beads.map(b => b.x)) + 60,
      h: Math.max(...beads.map(b => b.y)) + 60
    };
  }, [beads]);

  // Группировка статистики по цветам
  const colorStats = useMemo(() => {
    const stats = new Map<string, number>();
    beads.forEach(bead => {
      const isNode = bead.type === 'NODE';
      const defaultColor = isNode ? '#22d3ee' : '#e879f9';
      const color = designMap.get(bead.id) || defaultColor;
      stats.set(color, (stats.get(color) || 0) + 1);
    });
    return Array.from(stats.entries());
  }, [beads, designMap]);

  return (
    <div className="workspace-container"
      onMouseDown={() => startDrawing()}
      onMouseUp={() => stopDrawing()}
      onMouseLeave={() => stopDrawing()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="canvas-wrapper select-none">
        <svg 
          width={dim.w} 
          height={dim.h}
          viewBox={`0 0 ${dim.w} ${dim.h}`}
          className="bg-slate-800 rounded-3xl shadow-2xl border border-white/5 overflow-visible"
        >
          <g>
            {beads.map((bead) => (
              <BeadView
                key={bead.id}
                bead={{ ...bead, color: designMap.get(bead.id) }}
                onMouseEnter={() => isDrawing && paintBead(bead.id)}
                onMouseDown={() => paintBead(bead.id)}
              />
            ))}
          </g>
        </svg>

        {/* Унифицированная кнопка КОЛОНКИ */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddCol(); }}
          className="btn-control absolute flex-col h-24 w-12 rounded-2xl"
          style={{ left: dim.w + 120, top: 150 + (dim.h / 2) - 48 }}
        >
          <span className="text-xl mb-1">+</span>
          <span className="text-[9px] font-black uppercase rotate-90 tracking-widest">Col</span>
        </button>

        {/* Унифицированная кнопка РЯДЫ */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddRow(); }}
          className="btn-control absolute h-12 px-8 rounded-2xl"
          style={{ top: dim.h + 120, left: 150 + (dim.w / 2) - 80 }}
        >
          <span className="text-xl mr-3">+</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Row</span>
        </button>
      </div>

      {/* Статистика СЛЕВА: Общий счет */}
      <div className="stats-panel-base left-6">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Total Count</span>
          <span className="text-slate-200 font-mono text-xl">{beads.length}</span>
        </div>
      </div>

      {/* Статистика СПРАВА: Расход по цветам */}
      <div className="stats-panel-base right-6 gap-3">
        {colorStats.map(([color, count]) => (
          <div key={color} className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-md border border-white/5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-slate-300 font-mono text-xs">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};