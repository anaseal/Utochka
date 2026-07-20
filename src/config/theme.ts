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
    initialWidth: 70,
    initialHeight: 8,
    verticalCompression: 0.2,
    horizontalStepMultiplier: 0.8,
    offsetX: 120,
    // Отступ слева, когда per-row span-контролы (CanvasRulers) свёрнуты на
    // ≤767.98px (CanvasView.tsx) — рассчитан под номера рядов (baselineX=-30,
    // text-anchor=end, ширина цифр ~20-24px), без места под ±/счётчик.
    offsetXCollapsed: 60,
    offsetY: 50,
    edgeArcHeight: 13, // ≈ spacing(65) * verticalCompression(0.2) — высота дуги верхней/нижней кромки
  },

  constraints: {
    minSpan: 3,
    maxSpan: 10,
    minSpacing: 45,
    maxSpacing: 85,
    spacingStep: 5,
  },

  // Промежуточный декор — горизонтальные полосы бисерин между рядами узлов.
  decorDefaults: {
    minRows: 1, // Меньше — полоса считается отсутствующей
    maxRows: 10,
  },

  // Цепочки-подвески между двумя нижними узлами (см. utils/pendantChain.ts).
  pendantChainDefaults: {
    // Глубина провиса = sagScale · distance^sagExponent — нелинейно от
    // расстояния между узлами-креплениями (в отличие от edgeArcHeight,
    // фиксированной дуги кромки). sagExponent < 1 делает отношение
    // sag/distance убывающим: цепочка между 3 нодами провисает глубоко
    // относительно своей длины, а между 50 нодами — уже не так глубоко,
    // иначе линейный рост дал бы неестественно растянутую дугу.
    sagScale: 3.5,
    sagExponent: 0.5,
  },

  // Нитка — визуальный слой поверх схемы (не бисерина, не входит в
  // спецификацию материалов, см. spec.md, «Нитка»). Цвет и толщина линии —
  // в CSS (--thread-color в CanvasView.css, зависит от темы холста; сама
  // толщина — в ThreadLayer.css, как у прочих декоративных слоёв); тут только
  // размер ручек концов, т.к. он завязан на общий hitboxRadius сетки.
  threadDefaults: {
    handleRadiusFactor: 0.7, // от hitboxRadius
  },

  ui: {
    recentColorsLimit: 5,
  },
};

export const defaultColorFor = (type: BeadType): string =>
  type === 'NODE' ? BEAD_THEME.colors.nodeDefault : BEAD_THEME.colors.spanDefault;

// Zoom — общее понятие для обеих техник (Silyanka и CrossWeave), не силяночное,
// поэтому вынесен из BEAD_THEME.constraints в отдельный объект.
export const APP_CONSTRAINTS = {
  minZoom: 0.25,
  maxZoom: 3,
  zoomStep: 0.1,
};

// Reference Window — плавающее окно с картинкой-образцом, общее для обеих техник.
export const REFERENCE_WINDOW = {
  defaultWidth: 320,
  defaultHeight: 380,
  minWidth: 220,
  minHeight: 200,
  minZoom: 0.25,
  maxZoom: 4,
  zoomStep: 0.1,
  downscaleMaxSide: 2000,
  jpegQuality: 0.85,
};
