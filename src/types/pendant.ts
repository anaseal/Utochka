import { BeadType } from './bead';

export type PendantBeadShape = 'circle' | 'rect';

export interface PendantTemplateBead {
  /** Горизонтальное смещение от центра якорной ноды, в координатах макета */
  dx: number;
  /** Вертикальное смещение вниз от центра якорной ноды, в координатах макета */
  dy: number;
  shape: PendantBeadShape;
  type: BeadType;
  /** Радиус, для shape === 'circle' */
  r?: number;
  /** Ширина, для shape === 'rect' */
  w?: number;
  /** Высота, для shape === 'rect' */
  h?: number;
}

export interface PendantTemplate {
  id: string;
  name: string;
  /** beads[0] всегда касается ноды-якоря — заливка перетекает через неё */
  beads: PendantTemplateBead[];
  /** Пары индексов физически соприкасающихся бусин — граф смежности для заливки */
  links: [number, number][];
}

// Якорь ТОЧЕЧНОЙ подвески: настоящая нода нижнего ряда (по колонке) либо
// узел-граница меша зубца (bead.side непустой — тот же критерий, что и у
// конца цепочки-подвески, см. ChainEndpoint и «границы меша» в
// utils/tooth.ts) — форма идентична ChainEndpoint не случайно: у зубца
// несколько равноправных точек крепления, а не одна, поэтому подвеска
// адресуется так же, по (placementId, beadIndex). Зубец занимает свою полосу
// [startCol, endCol] нижнего ряда целиком — подвеска с {kind:'grid'} на эти
// колонки не ставится (см. spec.md, «Зубец»).
export type PendantAnchor =
  | { kind: 'grid'; col: number }
  | { kind: 'tooth'; placementId: string; beadIndex: number };

export interface PendantPlacement {
  placementId: string;
  templateId: string;
  anchor: PendantAnchor;
  /** Цвета отдельных бусин: индекс бусины в template.beads → цвет */
  colorMap: Record<number, string>;
}

// Конец цепочки — либо настоящий узел нижнего ряда (как раньше), либо узел на
// границе меша зубца (см. ToothMeshBead.side в utils/tooth.ts): зубцы растут
// из nodes нижнего ряда, поэтому у них тоже есть узлы, к которым можно
// прицепить цепочку — не только к основной сетке.
export type ChainEndpoint =
  | { kind: 'grid'; col: number }
  | { kind: 'tooth'; placementId: string; beadIndex: number };

export interface PendantChain {
  placementId: string;
  /** Начало цепочки — порядок клика, никакой канонической сортировки (в
   * отличие от прежних числовых startCol/endCol, конец на зубце не с чем
   * сравнивать через Math.min/max). */
  start: ChainEndpoint;
  /** Конец цепочки. */
  end: ChainEndpoint;
  /** Цвета отдельных бисерин цепочки: индекс бисерины (0..N-1) → цвет */
  colorMap: Record<number, string>;
}

// Индивидуальный декор-хвост: прямая колонка бисерин, свисающая с ОДНОЙ ноды
// нижнего ряда (в отличие от Decor Bands в generator.ts, которые кладутся на
// весь ряд целиком). Кончик хвоста, в свою очередь, может стать якорем для
// обычной подвески (см. pendantAnchors в useSilyankaProject.ts) — «подвеска
// вешается на хвост, как на ноду».
export interface DecorTailPlacement {
  placementId: string;
  /** Индекс колонки ноды нижнего ряда, к которой крепится хвост */
  col: number;
  /** Длина хвоста в бисеринах, 1–10 (BEAD_THEME.decorDefaults.minRows/maxRows) */
  rows: number;
  /** Цвета отдельных бисерин хвоста: индекс бисерины (0..rows-1) → цвет */
  colorMap: Record<number, string>;
}

// Зубец: локальный выступ, сужающийся в точку, растущий вниз от полосы
// колонок нижнего ряда (см. utils/tooth.ts). В отличие от PendantChain
// (свободная дуга между двумя узлами) — это мини-ромбовидное плетение,
// повторяющее диагональную сетку generator.ts, но локально и снаружи
// полотна; rows (глубина схождения в точку) в модели нет — она равна
// endCol − startCol и выводится геометрией, а не хранится и не
// настраивается (см. getToothRows в tooth.ts).
export interface ToothPlacement {
  placementId: string;
  /** Индекс колонки узла нижнего ряда — начало полосы (всегда startCol < endCol) */
  startCol: number;
  /** Индекс колонки узла нижнего ряда — конец полосы */
  endCol: number;
  /** Цвета бисерин меша по плоскому индексу (см. computeToothMesh в tooth.ts) */
  colorMap: Record<number, string>;
}
