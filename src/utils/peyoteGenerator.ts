import { PeyoteBead } from '../types/peyoteBead';

// Peyote: кирпичная кладка — все ряды одной ширины (width), нечётные ряды
// сдвинуты на pitchX/2 вправо относительно чётных. В отличие от
// crossWeaveGenerator.ts (там нечётные — вертикальные — ряды короче на 1
// бисерину), тут ширина одинакова у всех рядов: сдвиг сам по себе даёт
// зубчатый край по бокам, без укорачивания ряда и без санитизации чётности.
//
// pitchY — шаг между соседними рядами (полный, в отличие от crossWeave, где
// между рядами всегда вклинивается ряд другой ориентации и фактический шаг —
// pitchY/2) — у Peyote ряды не чередуются по типу, только по сдвигу.
export const generatePeyoteGrid = (
  width: number,
  height: number,
  pitchX: number,
  pitchY: number,
): PeyoteBead[] => {
  const beads: PeyoteBead[] = [];

  for (let r = 0; r < height; r++) {
    const offsetX = r % 2 === 1 ? pitchX / 2 : 0;

    for (let c = 0; c < width; c++) {
      beads.push({
        id: `peyote-${r}-${c}`,
        x: c * pitchX + offsetX,
        y: r * pitchY,
        logicalIndex: { row: r, col: c },
      });
    }
  }

  return beads;
};
