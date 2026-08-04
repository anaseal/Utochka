import { describe, it, expect } from 'vitest';
import { generatePeyoteGrid } from './peyoteGenerator';

describe('generatePeyoteGrid', () => {
  it('every row has exactly `width` beads, regardless of parity', () => {
    const beads = generatePeyoteGrid(4, 5, 14, 16);
    const countByRow = (r: number) => beads.filter(b => b.logicalIndex.row === r).length;
    for (let r = 0; r < 5; r++) expect(countByRow(r)).toBe(4);
  });

  it('odd rows are shifted by pitchX/2 relative to even rows', () => {
    const beads = generatePeyoteGrid(4, 2, 20, 16);
    const evenX = beads.filter(b => b.logicalIndex.row === 0).map(b => b.x).sort((a, b) => a - b);
    const oddX = beads.filter(b => b.logicalIndex.row === 1).map(b => b.x).sort((a, b) => a - b);
    expect(evenX).toEqual([0, 20, 40, 60]);
    expect(oddX).toEqual([10, 30, 50, 70]);
  });

  it('vertical step between adjacent rows is constant and equals pitchY (full step, not halved)', () => {
    const beads = generatePeyoteGrid(3, 4, 14, 10);
    for (let r = 0; r < 4; r++) {
      const ys = beads.filter(b => b.logicalIndex.row === r).map(b => b.y);
      expect(new Set(ys).size).toBe(1);
      expect(ys[0]).toBe(r * 10);
    }
  });

  it('width=1: every row has a single bead, odd rows shifted by pitchX/2', () => {
    const beads = generatePeyoteGrid(1, 3, 14, 14);
    expect(beads.filter(b => b.logicalIndex.row === 0)[0].x).toBe(0);
    expect(beads.filter(b => b.logicalIndex.row === 1)[0].x).toBe(7);
    expect(beads.filter(b => b.logicalIndex.row === 2)[0].x).toBe(0);
  });

  it('ids are unique and match peyote-{r}-{c}', () => {
    const beads = generatePeyoteGrid(3, 3, 14, 14);
    const ids = beads.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(beads.find(b => b.logicalIndex.row === 1 && b.logicalIndex.col === 2)!.id).toBe('peyote-1-2');
  });
});
