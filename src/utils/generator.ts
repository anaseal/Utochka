/* src/utils/generator.ts */
import { Bead } from '../types/bead';
import { BEAD_THEME } from '../config/theme';

type SpanCoords = Pick<Bead, 'x' | 'y'>;

export const generateSilyankaGrid = (
  width: number,
  height: number,
  spacing: number,
  topSpan: number,
  bottomSpan: number,
  rowSpanOverrides: Record<number, number> = {}
): Bead[] => {
  const beads: Bead[] = [];
  const {
    verticalCompression,
    horizontalStepMultiplier
  } = BEAD_THEME.gridDefaults;

  const stepX = spacing * horizontalStepMultiplier;
  const internalTop = Math.max(0, topSpan - 2); // для горизонтальных спанов верхнего ряда

  const getSpanCount = (r: number): number =>
    rowSpanOverrides[r] !== undefined ? rowSpanOverrides[r] : (r % 2 === 0 ? bottomSpan : topSpan);

  const getInternalCount = (r: number): number => Math.max(0, getSpanCount(r) - 2);

  const getYStep = (r: number): number =>
    (getInternalCount(r) + 1) * (spacing * verticalCompression);

  const nodeGrid: SpanCoords[][] = [];
  let currentY = 0;

  // 1. Создаем сетку узловых точек
  for (let r = 0; r <= 2 * height; r++) {
    const rowNodes: SpanCoords[] = [];
    const isShifted = r % 2 !== 0;
    const currentOffsetX = isShifted ? stepX / 2 : 0;

    for (let c = 0; c < width; c++) {
      rowNodes.push({
        x: c * stepX + currentOffsetX,
        y: currentY
      });
    }
    nodeGrid.push(rowNodes);
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
        clusterId,
        logicalIndex: { row: r, col: c }
      });
    }
  };

  for (let r = 0; r < nodeGrid.length; r++) {
    for (let c = 0; c < width; c++) {
      const currentNode = nodeGrid[r][c];
      
      beads.push({
        id: `node-${r}-${c}`,
        x: currentNode.x,
        y: currentNode.y,
        type: 'NODE',
        clusterId: `node-${r}-${c}`,
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

        neighborIndices.forEach((nIdx, sideIdx) => {
          const nextNode = nextRow[nIdx];
          if (nextNode) {
            const side = sideIdx === 0 ? 'left' : 'right';
            generateSpan(currentNode, nextNode, currentCount, `edge-${r}-${c}-${side}`, r, c);
          }
        });
      }
    }
  }

  return beads;
};