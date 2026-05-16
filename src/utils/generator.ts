import { Bead } from '../types/bead';
import { BEAD_THEME } from '../config/theme';
import { resolveSpanCount } from './spans';

type SpanCoords = Pick<Bead, 'x' | 'y'>;

export const generateSilyankaGrid = (
  width: number,
  height: number,
  spacing: number,
  topSpan: number,
  bottomSpan: number,
  rowSpanOverrides: Record<number, number> = {},
  decorBands: Record<number, number> = {}
): Bead[] => {
  const beads: Bead[] = [];
  const {
    verticalCompression,
    horizontalStepMultiplier
  } = BEAD_THEME.gridDefaults;

  // Верхняя горизонтальная цепочка (r=0) — отдельный per-row override с ключом -1
  const topEdgeCount = resolveSpanCount(-1, topSpan, bottomSpan, rowSpanOverrides);
  const internalTop = Math.max(0, topEdgeCount - 2);
  const minBeadPitch = BEAD_THEME.sizes.spanRadius * 2 + 2; // минимальный шаг без перекрытия ≈ 14px
  const stepX = Math.max(
    spacing * horizontalStepMultiplier,
    (internalTop + 1) * minBeadPitch
  );

  const getInternalCount = (r: number): number =>
    Math.max(0, resolveSpanCount(r, topSpan, bottomSpan, rowSpanOverrides) - 2);

  const getYStep = (r: number): number =>
    (getInternalCount(r) + 1) * (spacing * verticalCompression);

  // Промежуточный декор: шаг между декор-рядами полосы (тот же, что у пролётов)
  const decorRowStep = spacing * verticalCompression;
  // Число декор-рядов полосы после узлового ряда r (0 — полосы нет)
  const getDecorRows = (r: number): number => {
    const n = decorBands[r];
    return r >= 0 && r < 2 * height && typeof n === 'number' && n > 0
      ? Math.floor(n)
      : 0;
  };

  const nodeGrid: SpanCoords[][] = [];
  // decorGrid[r] — декор-ряды (сверху вниз) полосы между узловым рядом r и r+1
  const decorGrid: Record<number, SpanCoords[][]> = {};
  let currentY = 0;

  // 1. Создаём сетку узловых точек; декор-полосы раздвигают полотно по вертикали
  for (let r = 0; r <= 2 * height; r++) {
    const rowNodes: SpanCoords[] = [];
    const isShifted = r % 2 !== 0;
    const currentOffsetX = isShifted ? stepX / 2 : 0;
    const rowWidth = isShifted ? width - 1 : width;

    for (let c = 0; c < rowWidth; c++) {
      rowNodes.push({
        x: c * stepX + currentOffsetX,
        y: currentY
      });
    }
    nodeGrid.push(rowNodes);

    // Декор-полоса после ряда r: горизонтальные ряды бисерин по разметке ряда r
    const decorRows = getDecorRows(r);
    if (decorRows > 0) {
      const band: SpanCoords[][] = [];
      for (let k = 1; k <= decorRows; k++) {
        band.push(rowNodes.map(n => ({ x: n.x, y: currentY + k * decorRowStep })));
      }
      decorGrid[r] = band;
      currentY += decorRows * decorRowStep;
    }

    currentY += getYStep(r);
  }

  const generateSpan = (
    start: SpanCoords,
    end: SpanCoords,
    count: number,
    clusterId: string,
    r: number,
    c: number
  ) => {
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      beads.push({
        id: `span-${clusterId}-bead-${i}`,
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y),
        type: 'SPAN',
        logicalIndex: { row: r, col: c }
      });
    }
  };

  for (let r = 0; r < nodeGrid.length; r++) {
    // Декор-полоса раздвигает ряд r и r+1: диагональные грани ромбов стартуют
    // от нижнего декор-ряда полосы, а не от самого узлового ряда.
    const band = decorGrid[r];
    const edgeStartRow = band ? band[band.length - 1] : nodeGrid[r];

    for (let c = 0; c < nodeGrid[r].length; c++) {
      const currentNode = nodeGrid[r][c];

      beads.push({
        id: `node-${r}-${c}`,
        x: currentNode.x,
        y: currentNode.y,
        type: 'NODE',
        logicalIndex: { row: r, col: c }
      });

      if (r === 0 && c < width - 1) {
        generateSpan(currentNode, nodeGrid[0][c + 1], internalTop, `edge-top-link-${c}`, r, c);
      }

      const nextRow = nodeGrid[r + 1];
      if (nextRow) {
        const isBottomTransition = r % 2 === 0;
        const currentCount = getInternalCount(r);
        const neighborIndices = isBottomTransition ? [c - 1, c] : [c, c + 1];
        const edgeStartNode = edgeStartRow[c];

        neighborIndices.forEach((nIdx, sideIdx) => {
          const nextNode = nextRow[nIdx];
          if (nextNode) {
            const side = sideIdx === 0 ? 'left' : 'right';
            generateSpan(edgeStartNode, nextNode, currentCount, `edge-${r}-${c}-${side}`, r, c);
          }
        });
      }
    }

    // Декор-бисерины полосы: образуют вертикальные нити от узлов ряда r вниз.
    // Тип SPAN — красятся карандашом/ластиком как обычные пролёты.
    if (band) {
      band.forEach((decorRow, k) => {
        decorRow.forEach((coord, c) => {
          beads.push({
            id: `decor-${r}-${k + 1}-${c}`,
            x: coord.x,
            y: coord.y,
            type: 'SPAN',
            logicalIndex: { row: r, col: c }
          });
        });
      });
    }
  }

  return beads;
};
