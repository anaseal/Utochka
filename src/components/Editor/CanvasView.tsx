import { useMemo } from 'react';
import { Bead } from '../../types/bead';
import { BeadView } from '../BeadView';

interface CanvasViewProps {
  beads: Bead[];
  designMap: Map<string, string>;
  activeColor: string;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
}

export const CanvasView = ({
  beads,
  designMap,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
}: CanvasViewProps) => {
  
  const colorStats = useMemo(() => {
    const counts: Record<string, number> = {};
    beads.forEach((bead) => {
      const finalColor = designMap.get(bead.id) || (bead.type === 'NODE' ? '#22d3ee' : '#e879f9');
      counts[finalColor] = (counts[finalColor] || 0) + 1;
    });
    return counts;
  }, [beads, designMap]);

  return (
    <main
      className="relative bg-slate-800 rounded-[2.5rem] border border-slate-700 shadow-inner overflow-hidden w-full max-w-4xl aspect-[16/10] flex items-center justify-center cursor-crosshair"
      onMouseDown={startDrawing}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    >
      <svg viewBox="0 0 800 500" className="w-full h-full p-8">
        <g>
          {beads.map((bead) => (
            <BeadView
              key={bead.id}
              bead={{
                ...bead,
                color: designMap.get(bead.id) || (bead.type === 'NODE' ? '#22d3ee' : '#e879f9'),
              }}
              onClick={() => paintBead(bead.id)}
              onMouseEnter={() => isDrawing && paintBead(bead.id)}
            />
          ))}
        </g>
      </svg>

      <div className="absolute bottom-8 right-8 flex flex-col gap-2 items-end pointer-events-none">
        {Object.entries(colorStats).map(([color, count]) => (
          <div key={color} className="px-4 py-2 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 flex items-center gap-3 shadow-2xl">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-black text-white">{count}</span>
          </div>
        ))}
      </div>
    </main>
  );
};