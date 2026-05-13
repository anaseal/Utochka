import { useMemo } from 'react';
import { Bead } from '../../../types/bead';
import './CanvasRulers.css';

interface CanvasRulersProps {
  beads: Bead[];
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  onRowSpanChange: (spanRowIndex: number, delta: number) => void;
}

export const CanvasRulers = ({ beads, topSpan, bottomSpan, rowSpanOverrides, onRowSpanChange }: CanvasRulersProps) => {
  const axisMargin = 40;

  // Только левые узлы чётных рядов — для лейблов
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
    const minX = sortedNodes.length > 0 ? Math.min(...sortedNodes.map(n => n.x)) : 0;

    return sortedNodes.filter(n => Math.abs(n.x - minX) < 1);
  }, [beads]);

  // Y-позиции ВСЕХ node-рядов (и чётных, и нечётных) — для позиционирования контролов
  const allNodeRowYs = useMemo(() => {
    const ySet = new Set<number>();
    beads.filter(b => b.type === 'NODE').forEach(n => ySet.add(Math.round(n.y)));
    return Array.from(ySet).sort((a, b) => a - b);
  }, [beads]);

  const colAxesNodes = useMemo(() => {
    const distinctY = Array.from(new Set(beads.filter(b => b.type === 'NODE').map(n => Math.round(n.y))))
      .sort((a, b) => a - b);

    const targetY = distinctY[1];
    if (targetY === undefined) return [];

    return beads
      .filter(b => b.type === 'NODE' && Math.abs(Math.round(b.y) - targetY) < 1)
      .sort((a, b) => a.x - b.x);
  }, [beads]);

  const baselineX = useMemo(() =>
    (rowAxesNodes.length > 0 ? Math.min(...rowAxesNodes.map(n => n.x)) : 0) - axisMargin,
  [rowAxesNodes]);

  const baselineY = useMemo(() => {
    const nodes = beads.filter(b => b.type === 'NODE');
    if (nodes.length === 0) return 0;
    const minY = Math.min(...nodes.map(n => n.y));
    return minY - axisMargin;
  }, [beads]);

  // Контролы для каждого span-ряда (между двумя consecutive node-рядами)
  // r чётный = ножки (even→odd), r нечётный = плечи (odd→even)
  const spanRowControls = useMemo(() => {
    return allNodeRowYs.slice(0, -1).map((y, r) => {
      const nextY = allNodeRowYs[r + 1];
      const midY = (y + nextY) / 2;
      const isBottom = r % 2 === 0;
      const count = rowSpanOverrides[r] !== undefined
        ? rowSpanOverrides[r]
        : (isBottom ? bottomSpan : topSpan);
      const isOverridden = rowSpanOverrides[r] !== undefined;
      return { r, midY, count, isOverridden, isBottom };
    });
  }, [allNodeRowYs, rowSpanOverrides, topSpan, bottomSpan]);

  const ctrlCenterX = baselineX - 58;

  return (
    <g className="canvas__ruler-group">
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

      {spanRowControls.map(({ r, midY, count, isOverridden, isBottom }) => {
        const type = isBottom ? 'bottom' : 'top';
        return (
          <g key={`span-ctrl-${r}`}>
            <g
              className={`span-ctrl__btn-group span-ctrl__btn-group--${type}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onRowSpanChange(r, -1); }}
            >
              <rect
                x={ctrlCenterX - 27}
                y={midY - 8}
                width={16}
                height={16}
                rx={4}
                className={`span-ctrl__btn span-ctrl__btn--${type}`}
              />
              <text
                x={ctrlCenterX - 19}
                y={midY}
                dominantBaseline="middle"
                textAnchor="middle"
                className="span-ctrl__btn-text"
              >
                −
              </text>
            </g>

            <text
              x={ctrlCenterX - 3}
              y={midY}
              dominantBaseline="middle"
              textAnchor="middle"
              className={`span-ctrl__count span-ctrl__count--${type}${isOverridden ? ' span-ctrl__count--overridden' : ''}`}
            >
              {count}
            </text>

            <g
              className={`span-ctrl__btn-group span-ctrl__btn-group--${type}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onRowSpanChange(r, 1); }}
            >
              <rect
                x={ctrlCenterX + 10}
                y={midY - 8}
                width={16}
                height={16}
                rx={4}
                className={`span-ctrl__btn span-ctrl__btn--${type}`}
              />
              <text
                x={ctrlCenterX + 18}
                y={midY}
                dominantBaseline="middle"
                textAnchor="middle"
                className="span-ctrl__btn-text"
              >
                +
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
