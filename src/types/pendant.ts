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

export interface PendantPlacement {
  placementId: string;
  templateId: string;
  /** Индекс колонки ноды нижнего ряда, к которой крепится подвеска */
  col: number;
  /** Цвета отдельных бусин: индекс бусины в template.beads → цвет */
  colorMap: Record<number, string>;
}
