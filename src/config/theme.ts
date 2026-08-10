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
    spacing: 55,
    beadsInSpan: 3,
    initialWidth: 70,
    initialHeight: 4,
    verticalCompression: 0.2,
    horizontalStepMultiplier: 0.8,
    offsetX: 120,
    // Отступ слева, когда per-row span-контролы (CanvasRulers) свёрнуты
    // (CanvasView.tsx, дефолт на всех ширинах экрана) — рассчитан под номера
    // рядов (baselineX=-30, text-anchor=end, ширина цифр ~20-24px), без
    // места под ±/счётчик.
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
  // Модель физическая: бисерины лежат на круговой дуге с шагом ровно pitch
  // друг от друга и от узлов-креплений (иначе цепочка «не касается» узла).
  // Длина дуги = pitch·(count+1) — она всегда чуть больше хорды (расстояния
  // между узлами) на slackRatio; из этого избытка длины и получается провис.
  pendantChainDefaults: {
    // slackRatio(distance) = clamp(slackCoef / √distance, slackMin, slackMax).
    // Короткая цепочка держит больший относительный запас нити (провисает
    // заметно относительно своей длины), длинная — меньший (иначе дуга
    // выглядела бы неестественно растянутой). slackMax держит половинный
    // угол дуги заметно меньше 90° — иначе цепочка заворачивалась бы в
    // петлю поперёк хорды вместо дуги.
    slackCoef: 2.2,
    slackMin: 0.05,
    slackMax: 0.3,
  },

  // Нитка — визуальный слой поверх схемы (не бисерина, не входит в
  // спецификацию материалов, см. spec.md, «Нитка»). Цвет и толщина линии —
  // в CSS (--thread-color в CanvasView.css, зависит от темы холста; сама
  // толщина — в ThreadLayer.css, как у прочих декоративных слоёв); тут только
  // размер ручек концов, т.к. он завязан на общий hitboxRadius сетки.
  threadDefaults: {
    handleRadiusFactor: 0.7, // от hitboxRadius
    // Порог смещения (screen-space), отличающий драг ручки конца нитки
    // (перепрокладка) от обычного клика по той же бусине (см. STAMP_DRAG_THRESHOLD
    // в CanvasView.tsx — тот же приём, независимая пара констант).
    handleDragThreshold: 4,
    handleDragThresholdTouch: 10,
  },

  ui: {
    recentColorsLimit: 5,
  },
};

export const defaultColorFor = (type: BeadType): string =>
  type === 'NODE' ? BEAD_THEME.colors.nodeDefault : BEAD_THEME.colors.spanDefault;

// Прозрачный бисер — «цвет» кисти, которым помечают, что в этом месте стоит
// прозрачная бусина. Прозрачная бусина и НЕзакрашенная — это одно и то же:
// одинаковый вид на холсте и в PNG, одна строка `transparent` в сводке
// материалов (там она и означает «купить столько прозрачного бисера»).
// Поэтому значение не заводит вторую сущность в схеме: оно ложится в
// designMap как обычный цвет (заливка, штамп, зеркало работают без единого
// спецкейса), а на чтении приводится к незакрашенной через effectiveBeadColor
// и beadStateClass ниже. Восьмизначный hex — валидная запись цвета и в SVG
// fill, и в CSS, поэтому даже путь мимо нормализации не ломает отрисовку.
export const CLEAR_BEAD_COLOR = '#ffffff00';

export const isClearBead = (color: string | undefined): boolean => color === CLEAR_BEAD_COLOR;

// Бисерина выглядит незакрашенной: цвета нет вовсе либо он прозрачный.
export const isUnfilledBead = (color: string | undefined): boolean => !color || isClearBead(color);

// Цвет, которым бисерина реально рисуется и под которым считается в сводке
// материалов (`defaultColorFor` — 'transparent').
export const effectiveBeadColor = (color: string | undefined, fallback: string): string =>
  isUnfilledBead(color) ? fallback : color!;

// Модификатор состояния бисерины по её цвету — с ведущим пробелом, чтобы
// подставляться прямо в шаблон className (там, где раньше стояло
// `${!color ? ' bead--empty' : ''}`). Общий для всех четырёх техник и для
// слоёв подвесок/цепочек/зубцов/декор-хвостов силянки.
export const beadStateClass = (color: string | undefined): string =>
  isUnfilledBead(color) ? ' bead--empty' : '';

// Дефолты «кисти» нитки (см. useSilyankaProject/useCrossWeaveProject —
// activeThreadColor/activeThreadOpacity, персистятся отдельно от истории
// Undo/Redo, как activeColor для рисования) — общий источник для хуков и
// Header.tsx (образцы-точки в ThreadMenu), чтобы не дублировать hex в двух
// местах. Значения подобраны в тон прежним --thread-color/-2 (CanvasView.css).
export const THREAD_STRAND_DEFAULT_COLORS: Record<1 | 2, string> = {
  1: '#e2d6bb',
  2: '#22d3ee',
};
export const DEFAULT_THREAD_OPACITY = 0.85;

// Zoom и предел размера сетки — общие понятия для обеих техник (Silyanka и
// CrossWeave), не силяночные, поэтому вынесены из BEAD_THEME.constraints в
// отдельный объект. maxGridWidth/maxGridHeight — числа, которые видит и вводит
// пользователь в панели Grid (то же, что подписывает линейка на холсте);
// у силянки это со сдвигом от сырых gridSize.width/height (см. комментарий
// в App.tsx, «Линейка на холсте — источник правды»), у CrossWeave — без сдвига.
export const APP_CONSTRAINTS = {
  minZoom: 0.25,
  maxZoom: 3,
  zoomStep: 0.1,
  maxGridWidth: 100,
  maxGridHeight: 30,
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
