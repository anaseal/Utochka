import { useMemo } from 'react';
import { Bead } from '../../../types/bead';
import { resolveSpanCount } from '../../../utils/spans';
import { buildColumnAxis, computeMirrorAxisX } from '../../../utils/columnAxis';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import './CanvasRulers.css';

interface CanvasRulersProps {
  beads: Bead[];
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  onRowSpanChange: (spanRowIndex: number, delta: number) => void;
  width: number;
  topEdgeEnabled: boolean;
  bottomEdgeEnabled: boolean;
  // Ряд ±/счётчик на каждый span-ряд сворачивается по умолчанию на всех
  // ширинах экрана (см. CanvasView.tsx) — раскрывается тогглом
  // .span-controls-toggle (см. CanvasRulers.css).
  spanControlsExpanded: boolean;
  // Контр-преобразование подписей при повороте/отражении полотна в режиме
  // плетения (см. utils/weaveView.ts) — цифры остаются горизонтальными и
  // незеркальными в любом положении полотна.
  labelTransform?: (x: number, y: number) => string | undefined;
  // Доп. сдвиг влево для номеров рядов и ±/счётчиков (canvasDim.ts →
  // computeCanvasDim.shiftX) — компенсирует общий translate группы в
  // CanvasView, чтобы сама панель осталась на прежнем месте, а не наехала на
  // новые крайние бисерины нечётных рядов (см. spec.md). Ось зеркала и номера
  // колонок этот сдвиг не получают — они уже привязаны к реальным координатам
  // бисерин.
  gutterShiftX: number;
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
    onPointerDown={(e) => e.stopPropagation()}
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

export const CanvasRulers = ({ beads, topSpan, bottomSpan, rowSpanOverrides, onRowSpanChange, width, topEdgeEnabled, bottomEdgeEnabled, spanControlsExpanded, gutterShiftX, labelTransform }: CanvasRulersProps) => {
  // На ≤767.98px шрифт подписей мельче (CanvasRulers.css), а margin чуть
  // больше — левее для номеров рядов (baselineX=-axisMarginX, text-anchor
  // end — больше margin = левее), выше для номеров колонн (baselineY=
  // -axisMarginY). Это числовые SVG-координаты, а не CSS-свойства — тот же
  // case, что offsetX в CanvasView.tsx, поэтому здесь тоже useMediaQuery.
  const isNarrowViewport = useMediaQuery('(max-width: 767.98px)');
  const axisMarginX = isNarrowViewport ? 36 : 30;
  const axisMarginY = isNarrowViewport ? 46 : 40;

  const nodes = useMemo(() => beads.filter(b => b.type === 'NODE'), [beads]);

  const rowYMap = useMemo(() => {
    const map = new Map<number, number>();
    nodes.forEach(n => map.set(n.logicalIndex.row, n.y));
    return map;
  }, [nodes]);

  // Один узел на чётный ряд — координата Y для номера строки. Раньше строго
  // col===0, но при активном Taper (сужение концов, см. spec.md) у крайних
  // рядов колонки 0 может не быть вовсе — берём первый попавшийся узел ряда,
  // для позиционирования подписи важен только его y.
  const rowAxesNodes = useMemo(() => {
    const seen = new Set<number>();
    const result: typeof nodes = [];
    for (const n of nodes) {
      if (n.logicalIndex.row % 2 === 0 && !seen.has(n.logicalIndex.row)) {
        seen.add(n.logicalIndex.row);
        result.push(n);
      }
    }
    return result.sort((a, b) => a.logicalIndex.row - b.logicalIndex.row);
  }, [nodes]);

  // Ряд 1 (нечётный) обычно даёт колонки 0..width-2 (см. spec.md, «Диапазон
  // колонок нечётных рядов») — крайние два узла в подсчёт линейки не входят,
  // чтобы число колонок совпадало с шириной. При активном Taper с ненулевым
  // depth срез держится по всему полотну — крайние колонки могут не
  // существовать ни в одном ряду, поэтому buildColumnAxis достраивает их
  // позиции экстраполяцией (см. spec.md, «Линейка и Taper», и columnAxis.ts).
  const columnAxis = useMemo(() => {
    const points = nodes
      .filter(n => n.logicalIndex.row % 2 !== 0)
      .map(n => ({ col: n.logicalIndex.col, x: n.x }));
    return buildColumnAxis(points, width);
  }, [nodes, width]);

  const colAxesNodes = useMemo(() => columnAxis.map(({ col, x }) => ({
    id: `col-${col}`,
    x,
    logicalIndex: { col },
  })), [columnAxis]);

  // Сколько узлов уцелело в ряду — горизонтальной цепочке (верхней или нижней)
  // нужны хотя бы два соседних узла, иначе натягивать её не между чем.
  const rowNodeCounts = useMemo(() => {
    const map = new Map<number, number>();
    nodes.forEach(n => map.set(n.logicalIndex.row, (map.get(n.logicalIndex.row) ?? 0) + 1));
    return map;
  }, [nodes]);

  const baselineX = -axisMarginX;
  const baselineY = -axisMarginY;

  const spanRowControls = useMemo(() => {
    const rows = Array.from(rowYMap.keys()).sort((a, b) => a - b);

    const minGap = rows.length > 1
      ? Math.min(...rows.slice(0, -1).map((r, i) => rowYMap.get(rows[i + 1])! - rowYMap.get(r)!))
      : 24;

    const controls: {
      r: number;
      midY: number;
      count: number;
      isOverridden: boolean;
      isBottom: boolean;
    }[] = rows.slice(0, -1).map(r => {
      const y = rowYMap.get(r)!;
      const nextY = rowYMap.get(r + 1)!;
      const midY = (y + nextY) / 2;
      const isBottom = r % 2 === 0;
      const count = resolveSpanCount(r, topSpan, bottomSpan, rowSpanOverrides);
      const isOverridden = rowSpanOverrides[r] !== undefined;
      return { r, midY, count, isOverridden, isBottom };
    });

    // Верхняя горизонтальная грань (r=-1) — отдельный override. Скрывается
    // вместе с выключенной верхней цепочкой (Top Chain), как и r=-2 у Bottom Chain.
    // Используем минимальный gap между соседними рядами как базовый шаг —
    // он не растягивается декор-полосами и даёт стабильный отступ.
    // Сильное сужение может оставить в ряду один узел — цепочки тогда нет
    // вовсе, и степпер её количества бисерин управлял бы невидимым (см. spec.md).
    const firstRowY = rowYMap.get(0);
    if (topEdgeEnabled && firstRowY !== undefined && (rowNodeCounts.get(0) ?? 0) >= 2) {
      controls.unshift({
        r: -1,
        midY: firstRowY - minGap / 2,
        count: resolveSpanCount(-1, topSpan, bottomSpan, rowSpanOverrides),
        isOverridden: rowSpanOverrides[-1] !== undefined,
        isBottom: false,
      });
    }

    // Нижняя горизонтальная цепочка (r=-2) — тот же rowSpanOverrides, что и
    // верхняя (r=-1): по умолчанию равна bottomSpan (см. resolveSpanCount),
    // располагается под последним рядом.
    if (bottomEdgeEnabled && rows.length > 0 && (rowNodeCounts.get(rows[rows.length - 1]) ?? 0) >= 2) {
      const lastRowY = rowYMap.get(rows[rows.length - 1])!;
      controls.push({
        r: -2,
        midY: lastRowY + minGap / 2,
        count: resolveSpanCount(-2, topSpan, bottomSpan, rowSpanOverrides),
        isOverridden: rowSpanOverrides[-2] !== undefined,
        isBottom: true,
      });
    }

    return controls;
  }, [rowYMap, rowNodeCounts, rowSpanOverrides, topSpan, bottomSpan, topEdgeEnabled, bottomEdgeEnabled]);

  const ctrlCenterX = baselineX - 60;

  // Ось зеркала считается от НОМИНАЛЬНОЙ ширины (computeMirrorAxisX по
  // достроенной оси колонок), а не от габаритов уцелевшего полотна — иначе при
  // активном Taper линия съезжает вбок, хотя зеркалит редактор по полной сетке
  // (см. columnAxis.ts).
  const mirrorAxis = useMemo(() => {
    const x = computeMirrorAxisX(columnAxis, width);
    if (x === null) return null;
    const ys = Array.from(rowYMap.values());
    if (ys.length === 0) return null;
    const yTop = Math.min(...ys) - axisMarginY;
    const yBottom = Math.max(...ys) + axisMarginY;
    return { x, yTop, yBottom };
  }, [columnAxis, width, rowYMap, axisMarginY]);

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

      <g transform={`translate(${-gutterShiftX}, 0)`}>
        {rowAxesNodes.map((node, i) => (
          <text
            key={`idx-row-${node.id}`}
            x={baselineX}
            y={node.y}
            dominantBaseline="middle"
            textAnchor={labelTransform ? 'middle' : 'end'}
            transform={labelTransform?.(baselineX, node.y)}
            className="canvas__axis-text"
          >
            {i + 1}
          </text>
        ))}

        <g className={`span-ctrl-layer${spanControlsExpanded ? '' : ' span-ctrl-layer--collapsed'}`}>
          {spanRowControls.map(({ r, midY, count, isOverridden, isBottom }) => {
            const type = isBottom ? 'bottom' : 'top';
            const changeBy = (delta: number) => onRowSpanChange(r, delta);
            return (
              <g key={`span-ctrl-${r}`}>
                <SpanCtrlButton
                  cx={ctrlCenterX - 19}
                  midY={midY}
                  type={type}
                  glyph="−"
                  onClick={() => changeBy(-1)}
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
                  onClick={() => changeBy(1)}
                />
              </g>
            );
          })}
        </g>
      </g>

      {colAxesNodes.map((node) => (
        <text
          key={`idx-col-${node.id}`}
          x={node.x}
          y={baselineY}
          dominantBaseline="middle"
          textAnchor="middle"
          transform={labelTransform?.(node.x, baselineY)}
          className="canvas__axis-text"
        >
          {node.logicalIndex.col + 1}
        </text>
      ))}
    </g>
  );
};
