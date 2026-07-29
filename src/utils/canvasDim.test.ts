import { describe, it, expect } from 'vitest';
import { computeCanvasDim } from './canvasDim';

describe('computeCanvasDim', () => {
  it('returns a 100x100 default for an empty grid', () => {
    expect(computeCanvasDim([], 10, 10, 5)).toEqual({ w: 100, h: 100, shiftX: 0 });
  });

  it('computes width/height from bead bounds plus offsets, radius and margin', () => {
    const beads = [{ x: 0, y: 0 }, { x: 100, y: 50 }];
    expect(computeCanvasDim(beads, 10, 20, 5)).toEqual({ w: 145, h: 105, shiftX: 0 });
  });

  it('shifts by -minX when beads extend left of x=0 (odd rows of the grid)', () => {
    const beads = [{ x: -20, y: 0 }, { x: 30, y: 10 }];
    expect(computeCanvasDim(beads, 0, 0, 0)).toEqual({ w: 80, h: 40, shiftX: 20 });
  });

  it('extraMaxY extends the height when it exceeds the tallest bead (e.g. hanging pendants)', () => {
    const beads = [{ x: 0, y: 0 }, { x: 10, y: 5 }];
    const result = computeCanvasDim(beads, 0, 0, 0, { extraMaxY: 100 });
    expect(result.h).toBe(130); // 100 + offsetY(0) + radius(0) + margin(30)
  });

  it('a custom margin overrides the default 30', () => {
    const beads = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    const result = computeCanvasDim(beads, 0, 0, 0, { margin: 0 });
    expect(result).toEqual({ w: 10, h: 10, shiftX: 0 });
  });
});
