import { describe, it, expect } from 'vitest';
import {
  toothBeadId, isToothBeadId, parseToothBeadId, getToothRows, computeToothMesh, toothOverlaps,
} from './tooth';
import { ToothPlacement } from '../types/pendant';

describe('tooth bead id round-trip', () => {
  it('encodes and decodes placementId/index', () => {
    const id = toothBeadId('abc-123', 4);
    expect(isToothBeadId(id)).toBe(true);
    expect(parseToothBeadId(id)).toEqual(['abc-123', 4]);
  });

  it('grid/pendant/chain/decorTail ids are not recognized as tooth ids', () => {
    expect(isToothBeadId('node-0-3')).toBe(false);
    expect(isToothBeadId('pendant:abc:0')).toBe(false);
    expect(isToothBeadId('chain:abc:0')).toBe(false);
    expect(isToothBeadId('decorTail:abc:0')).toBe(false);
  });
});

describe('getToothRows', () => {
  it('equals the width in columns (endCol - startCol) — no separate constant', () => {
    expect(getToothRows(2, 6)).toBe(4);
    expect(getToothRows(0, 7)).toBe(7);
    expect(getToothRows(3, 4)).toBe(1);
  });
});

describe('computeToothMesh', () => {
  const STEP_X = 44;
  const ROW_Y_STEP = 22;

  it('converges to exactly one node bead on the last row, for several widths', () => {
    for (const [startCol, endCol] of [[2, 6], [0, 3], [1, 8]] as [number, number][]) {
      const mesh = computeToothMesh(startCol, endCol, 0, STEP_X, ROW_Y_STEP, 0);
      const rows = getToothRows(startCol, endCol);
      const lastRowY = rows * ROW_Y_STEP;
      const lastRowNodes = mesh.beads.filter(b => b.kind === 'node' && b.y === lastRowY);
      expect(lastRowNodes.length).toBe(1);
    }
  });

  it('node count per row decreases by exactly 1 per row (0.5 column/side per row, like taper.ts)', () => {
    const mesh = computeToothMesh(2, 6, 0, STEP_X, ROW_Y_STEP, 0);
    const rows = getToothRows(2, 6);
    for (let k = 1; k <= rows; k++) {
      const y = k * ROW_Y_STEP;
      const count = mesh.beads.filter(b => b.kind === 'node' && b.y === y).length;
      expect(count).toBe((6 - 2 + 1) - k);
    }
  });

  it('anchors reference both endpoints of the strip and every interior column between them', () => {
    const mesh = computeToothMesh(2, 5, 0, STEP_X, ROW_Y_STEP, 0);
    const anchoredCols = new Set(mesh.anchors.map(a => a.col));
    expect(anchoredCols).toEqual(new Set([2, 3, 4, 5]));
    // Внутренние колонки (3, 4) касаются ДВУХ бисерин ряда 1 — как любой
    // внутренний узел сетки граничит с двумя диагоналями; крайние (2, 5) — одной.
    expect(mesh.anchors.filter(a => a.col === 3).length).toBe(2);
    expect(mesh.anchors.filter(a => a.col === 2).length).toBe(1);
  });

  it('inserts internalCount interpolated span beads between each node pair', () => {
    const internalCount = 2;
    const mesh = computeToothMesh(2, 4, 0, STEP_X, ROW_Y_STEP, internalCount);
    const spanBeads = mesh.beads.filter(b => b.kind === 'span');
    // rows=2: row1 имеет 2 узла (по 2 родителя каждый = 4 перехода), row2 —
    // 1 узел (2 родителя = 2 перехода), итого 6 переходов × internalCount.
    expect(spanBeads.length).toBe(6 * internalCount);
  });

  it('with internalCount=0, adjacent nodes are connected directly with no span beads', () => {
    const mesh = computeToothMesh(2, 4, 0, STEP_X, ROW_Y_STEP, 0);
    expect(mesh.beads.every(b => b.kind === 'node')).toBe(true);
  });

  it('tags the leftmost/rightmost node of each row with its side; interior nodes get none; the tip gets both', () => {
    const mesh = computeToothMesh(2, 6, 0, STEP_X, ROW_Y_STEP, 0);
    const rows = getToothRows(2, 6);
    for (let k = 1; k <= rows; k++) {
      const y = k * ROW_Y_STEP;
      const rowNodes = mesh.beads
        .filter(b => b.kind === 'node' && b.y === y)
        .sort((a, b) => a.x - b.x);
      if (rowNodes.length === 1) {
        // Последний ряд — единственный узел-кончик, общая точка схода обеих сторон.
        expect(rowNodes[0].side).toEqual(['left', 'right']);
        continue;
      }
      expect(rowNodes[0].side).toEqual(['left']);
      expect(rowNodes[rowNodes.length - 1].side).toEqual(['right']);
      for (let i = 1; i < rowNodes.length - 1; i++) {
        expect(rowNodes[i].side).toBeUndefined();
      }
    }
  });

  it('span beads never get a side tag', () => {
    const mesh = computeToothMesh(2, 4, 0, STEP_X, ROW_Y_STEP, 2);
    expect(mesh.beads.filter(b => b.kind === 'span').every(b => b.side === undefined)).toBe(true);
  });
});

describe('toothOverlaps', () => {
  const makeTooth = (startCol: number, endCol: number): ToothPlacement =>
    ({ placementId: 'x', startCol, endCol, colorMap: {} });

  it('detects overlapping ranges', () => {
    expect(toothOverlaps(3, 6, [makeTooth(5, 8)])).toBe(true);
  });

  it('treats touching at a shared column as overlap', () => {
    expect(toothOverlaps(3, 5, [makeTooth(5, 8)])).toBe(true);
    expect(toothOverlaps(6, 8, [makeTooth(3, 6)])).toBe(true);
  });

  it('does not flag disjoint ranges', () => {
    expect(toothOverlaps(0, 2, [makeTooth(5, 8)])).toBe(false);
  });

  it('returns false against an empty list', () => {
    expect(toothOverlaps(0, 2, [])).toBe(false);
  });
});
