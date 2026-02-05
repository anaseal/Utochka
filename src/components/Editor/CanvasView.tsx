import { useMemo } from 'react';
import { Bead } from '../../types/bead';
import { BeadView } from '../BeadView';
import './CanvasView.css';

interface CanvasViewProps {
  beads: Bead[];
  designMap: Map<string, string>;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  zoom: number;
}

export const CanvasView = ({
  beads,
  designMap,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  zoom
}: CanvasViewProps) => {
  
  const dim = useMemo(() => {
    if (beads.length === 0) return { w: 100, h: 100 };
    return {
      w: Math.max(...beads.map(b => b.x)) + 150,
      h: Math.max(...beads.map(b => b.y)) + 150
    };
  }, [beads]);

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

  // --- ЛОГИКА ОСЕЙ ---

  // РЯДЫ: Самые левые выступающие ноды (Ряды 1, 2, 3...)
  const rowAxesNodes = useMemo(() => {
    const yGroups = new Map<number, Bead[]>();
    beads.filter(b => b.type === 'NODE').forEach(node => {
      const y = Math.round(node.y);
      if (!yGroups.has(y)) yGroups.set(y, []);
      yGroups.get(y)!.push(node);
    });

    const leftMostNodes = Array.from(yGroups.values()).map(group => 
      group.reduce((min, curr) => (curr.x < min.x ? curr : min), group[0])
    );

    const sortedNodes = leftMostNodes.sort((a, b) => a.y - b.y);
    const minX = Math.min(...sortedNodes.map(n => n.x));
    // Оставляем только те ноды, которые выступают максимально влево
    return sortedNodes.filter(n => Math.abs(n.x - minX) < 1);
  }, [beads]);

  // КОЛОНКИ: Ноды, которые находятся "между" 1 и 2 рядами (утопленные сверху)
  const colAxesNodes = useMemo(() => {
    // 1. Находим все NODE и сортируем их по уникальным уровням Y
    const distinctY = Array.from(new Set(beads.filter(b => b.type === 'NODE').map(n => Math.round(n.y))))
      .sort((a, b) => a - b);
    
    // 2. Нам нужен второй уровень Y (тот, что "утоплен" под первый ряд)
    const targetY = distinctY[1]; 

    if (targetY === undefined) return [];

    // 3. Берем все ноды на этом уровне Y — они и будут центрами колонок
    return beads
      .filter(b => b.type === 'NODE' && Math.abs(Math.round(b.y) - targetY) < 1)
      .sort((a, b) => a.x - b.x);
  }, [beads]);

  // Смещение для текста
  const axisMargin = 60;
  
  // X-координата для цифр рядов (слева от сетки)
  const baselineX = useMemo(() => 
    (rowAxesNodes.length > 0 ? Math.min(...rowAxesNodes.map(n => n.x)) : 0) - axisMargin, 
  [rowAxesNodes]);

  // Y-координата для цифр колонок (сверху от сетки)
  const baselineY = useMemo(() => {
    const minY = Math.min(...beads.filter(b => b.type === 'NODE').map(n => n.y));
    return minY - axisMargin;
  }, [beads]);

  return (
    <main 
      className="editor__viewport"
      onMouseDown={() => startDrawing()}
      onMouseUp={() => stopDrawing()}
      onMouseLeave={() => stopDrawing()}
      onDragStart={(e) => e.preventDefault()}
    >
      <section className="canvas">
        <div 
          className="canvas__svg" 
          style={{ '--canvas-zoom': zoom } as React.CSSProperties}
        >
          <svg
            width={dim.w}
            height={dim.h}
            viewBox={`0 0 ${dim.w} ${dim.h}`}
            className="canvas__svg-content"
          >
            <g className="canvas__ruler-group" aria-hidden="true">
              {/* Ряды (Слева) */}
              {rowAxesNodes.map((node, i) => (
                <text
                  key={`idx-row-${node.id}`}
                  x={baselineX}
                  y={node.y}
                  dominantBaseline="middle"
                  textAnchor="end"
                  className="canvas__axis-text"
                >
                  {i + 1}
                </text>
              ))}

              {/* Колонки (Сверху): теперь нумеруем только "утопленные" ноды */}
              {colAxesNodes.map((node, i) => (
                <text
                  key={`idx-col-${node.id}`}
                  x={node.x}
                  y={baselineY}
                  textAnchor="middle"
                  className="canvas__axis-text"
                >
                  {i + 1}
                </text>
              ))}
            </g>

            {beads.map((bead) => (
              <BeadView
                key={bead.id}
                bead={{ ...bead, color: designMap.get(bead.id) }}
                onMouseEnter={() => isDrawing && paintBead(bead.id)}
                onMouseDown={() => paintBead(bead.id)}
              />
            ))}
          </svg>
        </div>
      </section>

      <aside className="stats stats--left">
        <article className="stats__item">
          <h3 className="stats__label">Total Count</h3>
          <p className="stats__value">{beads.length}</p>
        </article>
      </aside>

      <aside className="stats stats--right">
        <ul className="stats__list">
          {colorStats.map(([color, count]) => (
            <li key={color} className="stats__color-badge">
              <span className="stats__indicator" style={{ backgroundColor: color }} />
              <span className="stats__value text-xs">{count}</span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
};