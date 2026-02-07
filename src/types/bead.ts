/* src/types/bead.ts */

export type BeadType = 'NODE' | 'SPAN';

export interface Bead {
  id: string;
  x: number;
  y: number;
  type: BeadType;
  color?: string;
  clusterId?: string;
  logicalIndex?: {
    row: number;
    col: number;
  };
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface BeadMap {
  [key: string]: string;
}

export interface GridSize {
  columns: number; // Вместо width
  rows: number;    // Вместо height
  spacing: number;
  topSpan: number;
  bottomSpan: number;
}