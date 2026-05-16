import { useMemo } from 'react';
import { Bead } from '../../../types/bead';
import { resolveSpanCount } from '../../../utils/spans';
import './CanvasRulers.css';

interface CanvasRulersProps {
  beads: Bead[];
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  onRowSpanChange: (spanRowIndex: number, delta: number) => void;
  hoveredRow: number | null;
  mirrorMode: boolean;
  width: number;
}

const SpanCtrlButton = ({
  cx,
  midY,
  type,
  glyph,
  onClick,
}: {
  cx: number;
  midY: number;
  type: 'top' | 'bottom';
  glyph: '−' | '+';
  onClick: () => void;
}) => (
  <g
    className={`span-ctrl__btn-group span-ctrl__btn-group--${type}`}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
  >
    <rect
      x={cx - 8}
      y={midY - 8}
      width={16}
      height={16}
      rx={4}
      className={`span-ctrl__btn span-ctrl__btn--${type}`}
    />
    <text
      x={cx}
      y={midY}
      dominantBaseline="middle"
      textAnchor="middle"
      className="span-ctrl__btn-text"
    >
      {glyph}
    </text>
  </g>
);

export const CanvasRulers = ({ beads, topSpan, bottomSpan, rowSpanOverrides, onRowSpanChange, hoveredRow, mirrorMode, width }: CanvasRulersProps) => {
  const axisMargin = 40;

  const nodes = useMemo(() => beads.filter(b => b.type === 'NODE'), [beads]);

  const rowYMap = useMemo(() => {
    const map = new Map<number, number>();
    nodes.forEach(n => map.set(n.logicalIndex.row, n.y));
    return map;
  }, [nodes]);

  const rowAxesNodes = useMemo(
    () =>
      nodes
        .filter(n => n.logicalIndex.col === 0 && n.logicalIndex.row % 2 === 0)
        .sort((a, b) => a.logicalIndex.row - b.logicalIndex.row),
    [nodes]
  );

  const colAxesNodes = useMemo(
    () =>
      nodes
        .filter(n => n.logicalIndex.row === 1)
        .sort((a, b) => a.logicalIndex.col - b.logicalIndex.col),
    [nodes]
  );

  const baselineX = -axisMargin;
  const baselineY = -axisMargin;

  const spanRowControls = useMemo(() => {
    const rows = Array.from(rowYMap.keys()).sort((a, b) => a - b);
    const controls = rows.slice(0, -1).map(r => {
      const y = rowYMap.get(r)!;
      const nextY = rowYMap.get(r + 1)!;
      const midY = (y + nextY) / 2;
      const isBottom = r % 2 === 0;
      const count = resolveSpanCount(r, topSpan, bottomSpan, rowSpanOverrides);
      const isOverridden = rowSpanOverrides[r] !== undefined;
      return { r, midY, count, isOverridden, isBottom };
    });

    // Верхняя горизонтальная грань (r=-1) — отдельный override.
    // Используем минимальный gap между соседними рядами как базовый шаг —
    // он не растягивается декор-полосами и даёт стабильный отступ.
    const firstRowY = rowYMap.get(0);
    if (firstRowY !== undefined) {
      const minGap = rows.length > 1
        ? Math.min(...rows.slice(0, -1).map((r, i) => rowYMap.get(rows[i + 1])! - rowYMap.get(r)!))
        : 24;
      controls.unshift({
        r: -1,
        midY: firstRowY - minGap / 2,
        count: resolveSpanCount(-1, topSpan, bottomSpan, rowSpanOverrides),
        isOverridden: rowSpanOverrides[-1] !== undefined,
        isBottom: false,
      });
    }

    return controls;
  }, [rowYMap, rowSpanOverrides, topSpan, bottomSpan]);

  const ctrlCenterX = baselineX - 58;

  const mirrorAxis = useMemo(() => {
    if (width <= 1) return null;
    let maxX = 0;
    for (const n of nodes) {
      if (n.logicalIndex.row % 2 === 0 && n.x > maxX) maxX = n.x;
    }
    if (maxX <= 0) return null;
    const ys = Array.from(rowYMap.values());
    if (ys.length === 0) return null;
    const yTop = Math.min(...ys) - axisMargin;
    const yBottom = Math.max(...ys) + axisMargin;
    return { x: maxX / 2, yTop, yBottom };
  }, [width, nodes, rowYMap]);

  return (
    <g className="canvas__ruler-group">
      {mirrorAxis && (
        <line
          x1={mirrorAxis.x}
          y1={mirrorAxis.yTop}
          x2={mirrorAxis.x}
          y2={mirrorAxis.yBottom}
          className="canvas__mirror-axis"
          pointerEvents="none"
        />
      )}

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
            <SpanCtrlButton
              cx={ctrlCenterX - 19}
              midY={midY}
              type={type}
              glyph="−"
              onClick={() => onRowSpanChange(r, -1)}
            />
            <text
              x={ctrlCenterX - 3}
              y={midY}
              dominantBaseline="middle"
              textAnchor="middle"
              className={`span-ctrl__count span-ctrl__count--${type}${isOverridden ? ' span-ctrl__count--overridden' : ''}`}
            >
              {count}
            </text>
            <SpanCtrlButton
              cx={ctrlCenterX + 18}
              midY={midY}
              type={type}
              glyph="+"
              onClick={() => onRowSpanChange(r, 1)}
            />
          </g>
        );
      })}

    </g>
  );
};
