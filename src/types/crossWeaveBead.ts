export type BeadOrientation = 'vertical' | 'horizontal';

export interface KrestikBead {
  id: string;
  x: number;
  y: number;
  orientation: BeadOrientation;
  logicalIndex: { row: number; col: number };
}

// width/height — логические размеры (число колонн/рядов, как их подписывает
// линейка), не сырые параметры generateKrestikGrid. Перевод — см.
// toRawDimensions в useKrestikProject.ts.
export interface KrestikGridConfig {
  width: number;
  height: number;
  pitchX: number;
  pitchY: number;
}
