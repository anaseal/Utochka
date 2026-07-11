export type BeadOrientation = 'vertical' | 'horizontal';

export interface CrossWeaveBead {
  id: string;
  x: number;
  y: number;
  orientation: BeadOrientation;
  logicalIndex: { row: number; col: number };
}

// width/height — логические размеры (число колонн/рядов, как их подписывает
// линейка), не сырые параметры generateCrossWeaveGrid. Перевод — см.
// toRawDimensions в useCrossWeaveProject.ts.
export interface CrossWeaveGridConfig {
  width: number;
  height: number;
  pitchX: number;
  pitchY: number;
}
