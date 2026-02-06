/* src/utils/generator.ts */
import { Bead } from '../types/bead';

export const generateSilyankaGrid = (
  width: number, 
  height: number, 
  spacing: number,
  topSpan: number,
  bottomSpan: number
): Bead[] => {
  const nodes: Bead[] = [];
  const spans: Bead[] = [];
  const horizontalStep = spacing * 2; 
  
  const vScale = 0.6;
  const getTopHeight = () => (spacing * vScale) * ((topSpan + 1) / 4);
  const getBottomHeight = () => (spacing * vScale) * ((bottomSpan + 1) / 4);

  const nodeLevels = height * 2 + 1;
  const nodeGrid: Bead[][] = [];

  for (let r = 0; r < nodeLevels; r++) {
    nodeGrid[r] = [];
    const xOffset = (r % 2) * (horizontalStep / 2);
    
    let currentY = 50;
    for (let i = 0; i < r; i++) {
      currentY += (i % 2 === 0) ? getTopHeight() : getBottomHeight();
    }

    for (let c = 0; c < width; c++) {
      const node: Bead = {
        id: `node-${r}-${c}`,
        x: c * horizontalStep + xOffset + 50,
        y: currentY,
        type: 'NODE',
        logicalIndex: { row: r, col: c }
      };
      nodeGrid[r][c] = node;
      nodes.push(node);
    }
  }

  // Верхний край (всегда использует topSpan)
  for (let c = 0; c < width - 1; c++) {
    const startNode = nodeGrid[0][c];
    const endNode = nodeGrid[0][c + 1];
    const clusterId = `top-edge-${c}`;
    for (let i = 1; i <= topSpan; i++) {
      const t = i / (topSpan + 1);
      spans.push({
        id: `bead-${clusterId}-${i}`,
        x: startNode.x + t * (endNode.x - startNode.x),
        y: startNode.y,
        type: 'SPAN',
        clusterId,
        logicalIndex: { row: 0, col: c }
      });
    }
  }

  // Грани
  for (let r = 0; r < nodeLevels - 1; r++) {
    const isBottom = (r % 2 !== 0);
    const currentCount = isBottom ? bottomSpan : topSpan;

    for (let c = 0; c < width; c++) {
      const currentNode = nodeGrid[r][c];
      const isShifted = r % 2 !== 0;
      const neighborIndices = isShifted ? [c, c + 1] : [c - 1, c];

      neighborIndices.forEach((nextCol, index) => {
        const nextNode = nodeGrid[r + 1]?.[nextCol];
        if (nextNode) {
          const side = index === 0 ? 'left' : 'right';
          const clusterId = `edge-${r}-${c}-${side}`;
          for (let i = 1; i <= currentCount; i++) {
            const t = i / (currentCount + 1);
            spans.push({
              id: `bead-${clusterId}-${i}`,
              x: currentNode.x + t * (nextNode.x - currentNode.x),
              y: currentNode.y + t * (nextNode.y - currentNode.y),
              type: 'SPAN',
              clusterId,
              logicalIndex: { row: r, col: c }
            });
          }
        }
      });
    }
  }
  return [...spans, ...nodes];
};