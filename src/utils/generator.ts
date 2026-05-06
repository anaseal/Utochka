/* src/utils/generator.ts */
import { Bead } from '../types/bead';
import { BEAD_THEME } from '../config/theme';

type SpanCoords = Pick<Bead, 'x' | 'y'>;

export const generateSilyankaGrid = (
  width: number, 
  height: number, 
  spacing: number,
  topSpan: number,
  bottomSpan: number
): Bead[] => {
  const beads: Bead[] = [];
  const { 
    verticalCompression, 
    horizontalStepMultiplier 
  } = BEAD_THEME.gridDefaults;

  const internalTop = Math.max(0, topSpan - 2);
  const internalBottom = Math.max(0, bottomSpan - 2);

  const topStepY = (internalTop + 1) * (spacing * verticalCompression); 
  const bottomStepY = (internalBottom + 1) * (spacing * verticalCompression);
  const stepX = spacing * horizontalStepMultiplier; 

  const nodeGrid: SpanCoords[][] = [];
  let currentY = 0; // Начинаем строго от 0

  // 1. Создаем сетку узловых точек
  for (let r = 0; r <= 2 * height; r++) {
    const rowNodes: SpanCoords[] = [];
    const isShifted = r % 2 !== 0;
    const currentOffsetX = isShifted ? stepX / 2 : 0;

    for (let c = 0; c < width; c++) {
      rowNodes.push({ 
        x: c * stepX + currentOffsetX, // Относительный X
        y: currentY 
      });
    }
    nodeGrid.push(rowNodes);
    currentY += (r % 2 === 0) ? bottomStepY : topStepY;
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
        const currentCount = isBottomTransition ? internalBottom : internalTop;
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