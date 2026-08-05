import { describe, it, expect } from 'vitest';
import { generateLoomGrid } from './loomGenerator';

describe('generateLoomGrid', () => {
  it('every row has exactly `width` beads', () => {
    const beads = generateLoomGrid(4, 5, 14, 16);
    const countByRow = (r: number) => beads.filter(b => b.logicalIndex.row === r).length;
    for (let r = 0; r < 5; r++) expect(countByRow(r)).toBe(4);
  });

  it('rows are NOT shifted regardless of parity — same x set for every row', () => {
    const beads = generateLoomGrid(4, 3, 20, 16);
    const xOf = (r: number) => beads.filter(b => b.logicalIndex.row === r).map(b => b.x).sort((a, b) => a - b);
    expect(xOf(0)).toEqual([0, 20, 40, 60]);
    expect(xOf(1)).toEqual([0, 20, 40, 60]);
    expect(xOf(2)).toEqual([0, 20, 40, 60]);
  });

  it('vertical step between adjacent rows is constant and equals pitchY', () => {
    const beads = generateLoomGrid(3, 4, 14, 10);
    for (let r = 0; r < 4; r++) {
      const ys = beads.filter(b => b.logicalIndex.row === r).map(b => b.y);
      expect(new Set(ys).size).toBe(1);
      expect(ys[0]).toBe(r * 10);
    }
  });

  it('ids are unique and match loom-{r}-{c}', () => {
    const beads = generateLoomGrid(3, 3, 14, 14);
    const ids = beads.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(beads.find(b => b.logicalIndex.row === 1 && b.logicalIndex.col === 2)!.id).toBe('loom-1-2');
  });
});
