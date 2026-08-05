import { useMemo } from 'react';
import { LoomBead } from '../../../types/loomBead';
import '../CanvasRulers/CanvasRulers.css';

interface LoomRulersProps {
  beads: LoomBead[];
  width: number;
  height: number;
  // См. CanvasRulers — контр-преобразование подписей в режиме плетения
  // (поворот/отражение полотна). Loom поддерживает режим плетения (сегмент
  // — ряд, см. spec.md), поэтому проп нужен — по образцу PeyoteRulers/
  // CrossWeaveRulers.
  labelTransform?: (x: number, y: number) => string | undefined;
}

// Простая нумерация рядов/колонок — по образцу PeyoteRulers: у Loom все ряды
// одной ширины и в одной фазе (см. loomGenerator.ts), поэтому и ряды, и
// колонки считаются по ЛЮБОМУ ряду/колонке — в отличие от crossWeave, где
// колонки критично считать именно по r=0 (там вертикальный ряд короче).
export const LoomRulers = ({ beads, width, height, labelTransform }: LoomRulersProps) => {
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
          textAnchor={labelTransform ? 'middle' : 'end'}
          transform={labelTransform?.(-axisMarginX, bead.y)}
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
          transform={labelTransform?.(bead.x, -axisMarginY)}
          className="canvas__axis-text canvas__axis-text--compact"
        >
          {i + 1}
        </text>
      ))}
    </g>
  );
};
