import { CrossWeaveBead } from '../types/crossWeaveBead';

// CrossWeave: та же чередующаяся решётка, что и у силянки (каждый второй ряд
// сдвинут на полшага по X и содержит на одну колонку меньше), но без
// node/span — каждая позиция решётки это одна реальная бисерина. Ориентация
// овала чередуется по чётности ряда (вертикальный/горизонтальный), а сдвиг
// привязан именно к вертикальным рядам — они уже «без первой бусины» и
// вложены между горизонтальными, это и даёт видимый крестик на стыке.
//
// pitchY — расстояние между соседними рядами ОДНОЙ ориентации (r и r+2), то
// есть между двумя горизонтальными рядами или двумя вертикальными. Так как
// между ними всегда вклинивается ряд другой ориентации, фактический шаг по Y
// между соседними рядами (r и r+1) — pitchY/2.
export const generateCrossWeaveGrid = (
  width: number,
  height: number,
  pitchX: number,
  pitchY: number,
): CrossWeaveBead[] => {
  const beads: CrossWeaveBead[] = [];
  const rowStepY = pitchY / 2;

  for (let r = 0; r < height; r++) {
    const orientation = r % 2 === 0 ? 'vertical' : 'horizontal';
    const isShifted = orientation === 'vertical';
    const offsetX = isShifted ? pitchX / 2 : 0;
    const rowWidth = isShifted ? Math.max(0, width - 1) : width;

    for (let c = 0; c < rowWidth; c++) {
      beads.push({
        id: `bead-${r}-${c}`,
        x: c * pitchX + offsetX,
        y: r * rowStepY,
        orientation,
        logicalIndex: { row: r, col: c },
      });
    }
  }

  return beads;
};
