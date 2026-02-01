import { Bead } from '../types/bead';

export const generateSilyankaGrid = (
  width: number, 
  height: number, 
  spacing: number,
  beadsInSpan: number = 6 
): Bead[] => {
  const nodes: Bead[] = [];
  const spans: Bead[] = [];

  const horizontalStep = spacing * 2; 
  const verticalStep = spacing * 1.2;

  const nodeGrid: Bead[][] = [];
  for (let r = 0; r < height; r++) {
    nodeGrid[r] = [];
    const xOffset = (r % 2) * (horizontalStep / 2);
    for (let c = 0; c < width; c++) {
      const node: Bead = {
        id: `node-${r}-${c}`,
        x: c * horizontalStep + xOffset + 50,
        y: r * verticalStep + 50,
        type: 'NODE',
        logicalIndex: { row: r, col: c }
      };
      nodeGrid[r][c] = node;
      nodes.push(node);
    }
  }

  // Замок (Верхний ряд)
  for (let c = 0; c < width - 1; c++) {
    const startNode = nodeGrid[0][c];
    const endNode = nodeGrid[0][c + 1];
    const clusterId = `top-lock-${c}`;
    for (let i = 1; i <= beadsInSpan; i++) {
      const t = i / (beadsInSpan + 1);
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

  // Основная сетка
  for (let r = 0; r < height - 1; r++) {
    for (let c = 0; c < width; c++) {
      const currentNode = nodeGrid[r][c];
      const isShifted = r % 2 !== 0;
      const neighborIndices = isShifted ? [c, c + 1] : [c - 1, c];

      neighborIndices.forEach((nextCol, index) => {
        const nextNode = nodeGrid[r + 1]?.[nextCol];
        if (nextNode) {
          const side = index === 0 ? 'left' : 'right';
          const clusterId = `edge-${r}-${c}-${side}`;
          for (let i = 1; i <= beadsInSpan; i++) {
            const t = i / (beadsInSpan + 1);
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

  // ВАЖНО: Узлы (nodes) возвращаем в конце, чтобы они были поверх пролетов (spans)
  return [...spans, ...nodes];
};