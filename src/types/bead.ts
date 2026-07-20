export type BeadType = 'NODE' | 'SPAN';

export interface Bead {
  id: string;
  x: number;
  y: number;
  type: BeadType;
  logicalIndex: { row: number; col: number };
}

export interface GridConfig {
  width: number;
  height: number;
  spacing: number;
  topSpan: number;
  bottomSpan: number;
}

export interface BottomEdgeDecor {
  enabled: boolean;
  span: number;
}

// Регулирует, заходят ли нечётные (сдвинутые) ряды на полшага левее/правее
// чётных (c=-1 / c=width-1) — полный ромб у самого края слева/справа
// независимо друг от друга, вместо всегда включённого расширения (см. spec.md).
export interface EdgeExtension {
  left: boolean;
  right: boolean;
}
