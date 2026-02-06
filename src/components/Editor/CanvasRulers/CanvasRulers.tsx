import { useMemo } from 'react';
import { Bead } from '../../../types/bead';
import './CanvasRulers.css';

interface CanvasRulersProps {
  beads: Bead[];
}

export const CanvasRulers = ({ beads }: CanvasRulersProps) => {
  const axisMargin = 60;

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
    
    return sortedNodes.filter(n => Math.abs(n.x - minX) < 1);
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

  return (
    <g className="canvas__ruler-group" aria-hidden="true">
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
    </g>
  );
};