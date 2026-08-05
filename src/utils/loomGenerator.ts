import { LoomBead } from '../types/loomBead';

// Loom: прямоугольная сетка станочного плетения (warp/weft) — все ряды
// одной ширины (width), БЕЗ сдвига по чётности ряда — в отличие от
// peyoteGenerator.ts (там нечётные ряды сдвинуты на pitchX/2). Нити основы
// натянуты параллельно, уточная нить с бисеринами проходит перпендикулярно
// им, и каждая бисерина сидит точно в ячейке пересечения — прямая матрица
// без перекоса, самая простая геометрия из всех техник.
export const generateLoomGrid = (
  width: number,
  height: number,
  pitchX: number,
  pitchY: number,
): LoomBead[] => {
  const beads: LoomBead[] = [];

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      beads.push({
        id: `loom-${r}-${c}`,
        x: c * pitchX,
        y: r * pitchY,
        logicalIndex: { row: r, col: c },
      });
    }
  }

  return beads;
};
