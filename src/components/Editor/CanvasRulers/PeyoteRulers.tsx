import { useMemo } from 'react';
import { PeyoteBead } from '../../../types/peyoteBead';
import '../CanvasRulers/CanvasRulers.css';

interface PeyoteRulersProps {
  beads: PeyoteBead[];
  width: number;
  height: number;
}

// Простая нумерация рядов/колонок — по образцу CrossWeaveRulers, но проще:
// у Peyote все ряды одной ширины (см. peyoteGenerator.ts), поэтому и ряды, и
// колонки считаются по ЛЮБОМУ ряду/колонке — в отличие от crossWeave, где
// колонки критично считать именно по r=0 (там вертикальный ряд короче).
export const PeyoteRulers = ({ beads, width, height }: PeyoteRulersProps) => {
  const axisMarginX = 30;
  const axisMarginY = 40;

  const rowLabelNodes = useMemo(
    () => beads.filter(b => b.logicalIndex.col === 0),
    [beads],
  );
  const colLabelNodes = useMemo(
    () => beads.filter(b => b.logicalIndex.row === 0),
    [beads],
  );

  if (width === 0 || height === 0) return null;

  return (
    <g className="canvas__ruler-group">
      {rowLabelNodes.map((bead, i) => (
        <text
          key={`idx-row-${bead.id}`}
          x={-axisMarginX}
          y={bead.y}
          dominantBaseline="middle"
          textAnchor="end"
          className="canvas__axis-text canvas__axis-text--compact"
        >
          {i + 1}
        </text>
      ))}

      {colLabelNodes.map((bead, i) => (
        <text
          key={`idx-col-${bead.id}`}
          x={bead.x}
          y={-axisMarginY}
          dominantBaseline="middle"
          textAnchor="middle"
          className="canvas__axis-text canvas__axis-text--compact"
        >
          {i + 1}
        </text>
      ))}
    </g>
  );
};
