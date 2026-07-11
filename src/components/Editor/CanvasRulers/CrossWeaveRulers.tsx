import { useMemo } from 'react';
import { CrossWeaveBead } from '../../../types/crossWeaveBead';
import '../CanvasRulers/CanvasRulers.css';

interface CrossWeaveRulersProps {
  beads: CrossWeaveBead[];
  width: number;
  height: number;
}

// Простая нумерация рядов/колонок — в отличие от силянки, у CrossWeave нет
// per-row span-контролов и оси зеркала, поэтому это не ветка CanvasRulers,
// а отдельный минимальный компонент.
export const CrossWeaveRulers = ({ beads, width, height }: CrossWeaveRulersProps) => {
  const axisMarginX = 30;
  const axisMarginY = 40;

  // Ряды считаем только по горизонтальным овалам (нечётные r) — именно они
  // образуют непрерывную горизонтальную линию бусин. Вертикальные ряды между
  // ними — это узлы «крестика», а не самостоятельные ряды.
  const rowLabelNodes = useMemo(
    () => beads.filter(b => b.orientation === 'horizontal' && b.logicalIndex.col === 0),
    [beads],
  );
  // Колонки считаем только по вертикальным овалам (r=0, чётные r) — они
  // образуют непрерывную вертикальную линию бусин по X. r=0 всегда чётный,
  // поэтому годится как опорный ряд без fallback.
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
          className="canvas__axis-text"
        >
          {i + 1}
        </text>
      ))}

      {colLabelNodes.map((bead, i) => (
        <text
          key={`idx-col-${bead.id}`}
          x={bead.x}
          y={-axisMarginY}
          textAnchor="middle"
          className="canvas__axis-text"
        >
          {i + 1}
        </text>
      ))}
    </g>
  );
};
