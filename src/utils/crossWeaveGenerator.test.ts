import { describe, it, expect } from 'vitest';
import { generateCrossWeaveGrid } from './crossWeaveGenerator';

describe('generateCrossWeaveGrid', () => {
  it('even (vertical) row has width-1 beads and is shifted; odd (horizontal) row is full width, no shift', () => {
    const beads = generateCrossWeaveGrid(4, 5, 14, 14);
    const countByRow = (r: number) => beads.filter(b => b.logicalIndex.row === r).length;
    expect(countByRow(0)).toBe(3);
    expect(countByRow(1)).toBe(4);
    expect(countByRow(2)).toBe(3);
    expect(countByRow(3)).toBe(4);
    expect(countByRow(4)).toBe(3);
  });

  it('orientation alternates by row parity: even — vertical, odd — horizontal', () => {
    const beads = generateCrossWeaveGrid(4, 4, 14, 14);
    for (const b of beads) {
      const expected = b.logicalIndex.row % 2 === 0 ? 'vertical' : 'horizontal';
      expect(b.orientation).toBe(expected);
    }
  });

  it('vertical (even) row is shifted by pitchX/2 relative to horizontal (odd)', () => {
    const beads = generateCrossWeaveGrid(4, 2, 20, 14);
    const verticalX = beads.filter(b => b.logicalIndex.row === 0).map(b => b.x).sort((a, b) => a - b);
    const horizontalX = beads.filter(b => b.logicalIndex.row === 1).map(b => b.x).sort((a, b) => a - b);
    expect(horizontalX).toEqual([0, 20, 40, 60]);
    expect(verticalX).toEqual([10, 30, 50]);
  });

  it('vertical row has no bead at the first position (col 0 shifted right)', () => {
    const beads = generateCrossWeaveGrid(4, 1, 20, 14);
    const firstRowXs = beads.filter(b => b.logicalIndex.row === 0).map(b => b.x);
    expect(Math.min(...firstRowXs)).toBe(10);
  });

  it('vertical step between adjacent rows is constant and equals pitchY/2', () => {
    const beads = generateCrossWeaveGrid(3, 4, 14, 10);
    for (let r = 0; r < 4; r++) {
      const ys = beads.filter(b => b.logicalIndex.row === r).map(b => b.y);
      expect(new Set(ys).size).toBe(1);
      expect(ys[0]).toBe(r * 5);
    }
  });

  it('step between rows of the same orientation (r and r+2) equals full pitchY', () => {
    const beads = generateCrossWeaveGrid(3, 5, 14, 10);
    const yOf = (r: number) => beads.find(b => b.logicalIndex.row === r)!.y;
    expect(yOf(2) - yOf(0)).toBe(10);
    expect(yOf(3) - yOf(1)).toBe(10);
    expect(yOf(4) - yOf(2)).toBe(10);
  });

  it('width=1: vertical (even) rows are empty (0 beads)', () => {
    const beads = generateCrossWeaveGrid(1, 3, 14, 14);
    expect(beads.filter(b => b.logicalIndex.row === 0).length).toBe(0);
    expect(beads.filter(b => b.logicalIndex.row === 1).length).toBe(1);
    expect(beads.filter(b => b.logicalIndex.row === 2).length).toBe(0);
  });

  it('ids are unique and match bead-{r}-{c}', () => {
    const beads = generateCrossWeaveGrid(3, 3, 14, 14);
    const ids = beads.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(beads.find(b => b.logicalIndex.row === 1 && b.logicalIndex.col === 2)!.id).toBe('bead-1-2');
  });
});
