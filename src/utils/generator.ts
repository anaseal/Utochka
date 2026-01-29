import { Bead, BeadType } from '../types/bead';

export const generateSilyankaGrid = (
  width: number, 
  height: number, 
  spacing: number,
  beadsInSpan: number = 3 // Параметр step из ФТ
): Bead[] => {
  const beads: Bead[] = [];
  const horizontalStep = spacing * 2; 
  const verticalStep = spacing * 1.2;

  // 1. Сначала генерируем все узлы (как в 1.2), чтобы иметь к ним доступ по индексам
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

  // 2. Логика связей (Connectivity) и Интерполяция (The Filling)
  for (let r = 0; r < height - 1; r++) {
    for (let c = 0; c < width; c++) {
      const currentNode = nodes[r][c];
      
      // Определяем соседей в ряду r + 1
      // В шахматной сетке узел соединяется с двумя нижними (лево-право)
      const isShifted = r % 2 !== 0;
      const neighborIndices = isShifted 
        ? [c, c + 1] // Для смещенного ряда
        : [c - 1, c]; // Для прямого ряда

      neighborIndices.forEach((nextCol, index) => {
        const nextNode = nodes[r + 1]?.[nextCol];
        
        if (nextNode) {
          const side = index === 0 ? 'left' : 'right';
          const clusterId = `edge-${r}-${c}-${side}`;

          // Интерполяция: создаем бисерины между currentNode и nextNode
          for (let i = 1; i <= beadsInSpan; i++) {
            const t = i / (beadsInSpan + 1); // Коэффициент смещения (0 < t < 1)
            
            // Линейная интерполяция вектора: P = P1 + t * (P2 - P1)
            const x = currentNode.x + t * (nextNode.x - currentNode.x);
            const y = currentNode.y + t * (nextNode.y - currentNode.y);

            beads.push({
              id: `bead-${clusterId}-${i}`,
              x,
              y,
              type: 'SPAN',
              color: '#e879f9', // Цвет пролета (fuchsia)
              clusterId,
              logicalIndex: { row: r, col: c } // Логическая привязка к стартовому узлу
            });
          }
        }
      });
    }
  }

  return beads;
};