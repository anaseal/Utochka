/* src/utils/generator.ts */
import { Bead, GridSize } from '../types/bead';

/**
 * Генерирует массив бисеринок на основе параметров сетки.
 * Расчет адаптирован так, чтобы ромбы можно было растягивать по горизонтали,
 * а бисер в пролетах распределялся равномерно.
 */
export const generateBeads = (gridSize: GridSize): Bead[] => {
  const { columns, rows, spacing, topSpan, bottomSpan } = gridSize;

  // Чтобы сделать отступы между средними нодами шире, 
  // мы разделяем единый spacing на горизонтальный и вертикальный шаги.
  // horizontalStep отвечает за ширину ромба (расстояние между узлами в ряду).
  // verticalStep отвечает за высоту (расстояние между рядами).
  const horizontalStep = spacing; 
  const verticalStep = spacing * 0.6; // Меньший коэффициент делает ромб более плоским и широким

  const nodeGrid: Bead[][] = [];
  const beads: Bead[] = [];

  // 1. Создание сетки основных узлов (вершины ромбов)
  for (let r = 0; r < rows; r++) {
    const rowNodes: Bead[] = [];
    const isShifted = r % 2 !== 0;

    for (let c = 0; c < columns; c++) {
      // Смещение каждого второго ряда создает шахматный порядок (сетку)
      const x = c * horizontalStep + (isShifted ? horizontalStep / 2 : 0);
      const y = r * verticalStep;

      const node: Bead = {
        id: `node-${r}-${c}`,
        x,
        y,
        type: 'NODE',
        logicalIndex: { row: r, col: c }
      };
      rowNodes.push(node);
      beads.push(node);
    }
    nodeGrid.push(rowNodes);
  }

  // 2. Заполнение верхнего края (горизонтальные перемычки)
  for (let c = 0; c < columns - 1; c++) {
    const startNode = nodeGrid[0][c];
    const endNode = nodeGrid[0][c + 1];
    const clusterId = `top-edge-${c}`;

    for (let i = 1; i <= topSpan; i++) {
      const t = i / (topSpan + 1);
      beads.push({
        id: `bead-${clusterId}-${i}`,
        x: startNode.x + t * (endNode.x - startNode.x),
        y: startNode.y,
        type: 'SPAN',
        clusterId,
        logicalIndex: { row: 0, col: c }
      });
    }
  }

  // 3. Заполнение граней (тело сетки)
  for (let r = 0; r < rows - 1; r++) {
    // Выбираем количество бисера в зависимости от того, верхняя это грань ромба или нижняя
    const currentSpan = (r % 2 === 0) ? topSpan : bottomSpan;

    for (let c = 0; c < columns; c++) {
      const currentNode = nodeGrid[r][c];
      const isShifted = r % 2 !== 0;

      // Каждый узел соединяется с узлами в следующем ряду (слева и справа внизу)
      const neighborIndices = isShifted ? [c, c + 1] : [c - 1, c];

      neighborIndices.forEach((nextCol, index) => {
        const nextNode = nodeGrid[r + 1]?.[nextCol];
        if (nextNode) {
          const side = index === 0 ? 'left' : 'right';
          const clusterId = `edge-${r}-${c}-${side}`;

          // Равномерно распределяем бисер между узлами по прямой линии
          for (let i = 1; i <= currentSpan; i++) {
            const t = i / (currentSpan + 1);
            beads.push({
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

  // 4. Заполнение нижнего края
  const lastRowIdx = rows - 1;
  for (let c = 0; c < columns - 1; c++) {
    const startNode = nodeGrid[lastRowIdx][c];
    const endNode = nodeGrid[lastRowIdx][c + 1];
    const clusterId = `bottom-edge-${c}`;

    for (let i = 1; i <= bottomSpan; i++) {
      const t = i / (bottomSpan + 1);
      beads.push({
        id: `bead-${clusterId}-${i}`,
        x: startNode.x + t * (endNode.x - startNode.x),
        y: startNode.y,
        type: 'SPAN',
        clusterId,
        logicalIndex: { row: lastRowIdx, col: c }
      });
    }
  }

  return beads;
};