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
