import { BeadType } from '../types/bead';

export const BEAD_THEME = {
  // Геометрические параметры бисерин (используются в расчетах генератора)
  sizes: {
    nodeRadius: 6,
    spanRadius: 6,
    hitboxRadius: 11, // Расширенная область клика
  },

  colors: {
    nodeDefault: 'transparent',
    spanDefault: 'transparent',
  },

  gridDefaults: {
    spacing: 65,
    beadsInSpan: 3,
    initialWidth: 10,
    initialHeight: 4,
    verticalCompression: 0.2,
    horizontalStepMultiplier: 0.8,
    offsetX: 120,
    offsetY: 50,
  },

  constraints: {
    minSpan: 3,
    maxSpan: 10,
  },

  // Промежуточный декор — горизонтальные полосы бисерин между рядами узлов.
  decorDefaults: {
    minRows: 1, // Меньше — полоса считается отсутствующей
    maxRows: 10,
  },

  ui: {
    recentColorsLimit: 4,
  },
};

export const defaultColorFor = (type: BeadType): string =>
  type === 'NODE' ? BEAD_THEME.colors.nodeDefault : BEAD_THEME.colors.spanDefault;
