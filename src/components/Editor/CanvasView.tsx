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
      w: Math.max(...beads.map(b => b.x)) + 100,
      h: Math.max(...beads.map(b => b.y)) + 100
    };
  }, [beads]);

  return (
    <main
      className="workspace-scroll"
      /* Устанавливаем слушатели на контейнер для глобального отслеживания */
      onMouseDown={() => startDrawing()}
      onMouseUp={() => stopDrawing()}
      onMouseLeave={() => stopDrawing()}
      /* Предотвращаем стандартное выделение текста/картинок при драге */
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="relative p-24 inline-block min-w-max min-h-max select-none">
        <svg 
          width={dim.w} 
          height={dim.h}
          viewBox={`0 0 ${dim.w} ${dim.h}`}
          className="bg-canvas rounded-xl shadow-2xl border border-white/5 overflow-visible"
        >
          <g>
            {beads.map((bead) => (
              <BeadView
                key={bead.id}
                bead={{
                  ...bead,
                  color: designMap.get(bead.id),
                }}
                /* Красим при наведении, если в пропсах isDrawing = true */
                onMouseEnter={() => {
                  if (isDrawing) paintBead(bead.id);
                }}
                /* Красим при первом клике */
                onMouseDown={() => paintBead(bead.id)}
              />
            ))}
          </g>
        </svg>

        <button
          onClick={onAddCol}
          className="btn-control absolute w-10 h-10"
          style={{ 
            left: dim.w + 120, 
            top: 100 + (dim.h / 2) - 20 
          }}
        >
          <span className="text-xl">+</span>
        </button>

        <button
          onClick={onAddRow}
          className="btn-control absolute px-6 py-2"
          style={{ 
            top: dim.h + 120, 
            left: 100 + (dim.w / 2) - 60 
          }}
        >
          <span className="mr-2 font-bold">+</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Add Row</span>
        </button>
      </div>
    </main>
  );
};