import { Bead, BeadType } from '../types/bead';

export const generateSilyankaGrid = (
  width: number, 
  height: number, 
  spacing: number,
  beadsInSpan: number = 3 
): Bead[] => {
  const beads: Bead[] = [];
  const horizontalStep = spacing * 2; 
  const verticalStep = spacing * 1.2;

  // 1. Генерация узлов (NODE)
  const nodes: Bead[][] = [];
  for (let r = 0; r < height; r++) {
    nodes[r] = [];
    const xOffset = (r % 2) * (horizontalStep / 2);
    for (let c = 0; c < width; c++) {
      const node: Bead = {
        id: `node-${r}-${c}`,
        x: c * horizontalStep + xOffset + 50,
        y: r * verticalStep + 50,
        type: 'NODE',
        color: '#22d3ee',
        logicalIndex: { row: r, col: c }
      };
      nodes[r][c] = node;
      beads.push(node);
    }
  }

  // --- ТЗ №11: Генерация верхнего ряда переходов («Замок») ---
  // Проходим по узлам самого первого ряда (r = 0)
  for (let c = 0; c < width - 1; c++) {
    const startNode = nodes[0][c];
    const endNode = nodes[0][c + 1];
    const clusterId = `top-lock-${c}`;

    for (let i = 1; i <= beadsInSpan; i++) {
      const t = i / (beadsInSpan + 1); // Коэффициент интерполяции
      
      // Линейная интерполяция между соседними узлами по горизонтали
      const x = startNode.x + t * (endNode.x - startNode.x);
      const y = startNode.y; // Строго горизонтальная линия

      beads.push({
        id: `bead-${clusterId}-${i}`,
        x,
        y,
        type: 'SPAN',
        color: '#e879f9', // Соответствует цвету пролета из ТЗ
        clusterId,
        logicalIndex: { row: 0, col: c }
      });
    }
  }
  // -----------------------------------------------------------

  // 2. Генерация ромбовидной сетки (Connectivity)
  for (let r = 0; r < height - 1; r++) {
    for (let c = 0; c < width; c++) {
      const currentNode = nodes[r][c];
      const isShifted = r % 2 !== 0;
      const neighborIndices = isShifted ? [c, c + 1] : [c - 1, c];

      neighborIndices.forEach((nextCol, index) => {
        const nextNode = nodes[r + 1]?.[nextCol];
        if (nextNode) {
          const side = index === 0 ? 'left' : 'right';
          const clusterId = `edge-${r}-${c}-${side}`;

          for (let i = 1; i <= beadsInSpan; i++) {
            const t = i / (beadsInSpan + 1);
            const x = currentNode.x + t * (nextNode.x - currentNode.x);
            const y = currentNode.y + t * (nextNode.y - currentNode.y);

            beads.push({
              id: `bead-${clusterId}-${i}`,
              x,
              y,
              type: 'SPAN',
              color: '#e879f9',
              clusterId,
              logicalIndex: { row: r, col: c }
            });
          }
        }
      });
    }
  }

  return beads;
};