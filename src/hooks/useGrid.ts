/* src/hooks/useGrid.ts */
import { useMemo } from 'react';
import { Bead, GridSize } from '../types/bead';

export const useGrid = (config: GridSize): Bead[] => {
  return useMemo(() => {
    const { columns, rows, spacing, topSpan, bottomSpan } = config;
    const beads: Bead[] = [];

    const internalTop = Math.max(0, topSpan - 2);
    const internalBottom = Math.max(0, bottomSpan - 2);

    // Оставляем сжатие, чтобы бисер сидел плотно
    const verticalCompression = 0.25;
    const topStepY = (internalTop + 1) * (spacing * verticalCompression); 
    const bottomStepY = (internalBottom + 1) * (spacing * verticalCompression);

    // РАСШИРЯЕМ НОДЫ: Увеличиваем горизонтальный шаг (множитель 1.5)
    // Это сделает ромбы широкими, как ты хочешь.
    const stepX = spacing * 1.2; 

    const nodeGrid: { x: number; y: number }[][] = [];
    let currentY = 50;

    for (let r = 0; r <= 2 * rows; r++) {
      const rowNodes = [];
      const isShifted = r % 2 !== 0;
      const offsetX = isShifted ? stepX / 2 : 0;

      for (let c = 0; c < columns; c++) {
        rowNodes.push({ x: 50 + c * stepX + offsetX, y: currentY });
      }
      nodeGrid.push(rowNodes);

      if (r % 2 === 0) {
        currentY += bottomStepY; 
      } else {
        currentY += topStepY;
      }
    }

    const generateSpan = (start: any, end: any, count: number, clusterId: string, r: number, c: number) => {
      for (let i = 1; i <= count; i++) {
        const t = i / (count + 1);
        beads.push({
          id: `${clusterId}-bead-${i}`,
          x: start.x + t * (end.x - start.x),
          y: start.y + t * (end.y - start.y),
          type: 'SPAN',
          clusterId,
          logicalIndex: { row: r, col: c }
        });
      }
    };

    for (let r = 0; r < nodeGrid.length; r++) {
      for (let c = 0; c < columns; c++) {
        const currentNode = nodeGrid[r][c];
        
        beads.push({
          id: `node-${r}-${c}`,
          x: currentNode.x,
          y: currentNode.y,
          type: 'NODE',
          clusterId: `node-${r}-${c}`,
          logicalIndex: { row: r, col: c }
        });

        if (r === 0 && c < columns - 1) {
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
  }, [config]);
}