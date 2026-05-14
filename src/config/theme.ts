import { BeadType } from '../types/bead';

export const BEAD_THEME = {
  // Геометрические параметры бисерин (используются в расчетах генератора)
  sizes: {
    nodeRadius: 6.5,
    spanRadius: 6,
    hitboxRadius: 11, // Расширенная область клика
  },

  colors: {
    nodeDefault: '#a5bdcf',
    spanDefault: '#d6e2e9',
  },

  gridDefaults: {
    spacing: 65,
    beadsInSpan: 3,
    initialWidth: 10,
    initialHeight: 4,
    verticalCompression: 0.25,
    horizontalStepMultiplier: 1.2,
    offsetX: 160,
    offsetY: 50,
  },

  constraints: {
    minSpan: 3,
    maxSpan: 10,
  },
};

export const defaultColorFor = (type: BeadType): string =>
  type === 'NODE' ? BEAD_THEME.colors.nodeDefault : BEAD_THEME.colors.spanDefault;
