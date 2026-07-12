import { describe, it, expect } from 'vitest';
import { mirrorCrossWeaveBeadId, shiftCrossWeaveDesignMapColumns } from './crossWeaveMirror';

// rawWidth=5: горизонтальный (нечётный) ряд — 5 бусин (c=0..4),
// вертикальный (чётный) ряд — 4 бусины (c=0..3).
const RW = 5;

describe('mirrorCrossWeaveBeadId — horizontal row (odd r, full width)', () => {
  it('col c ↔ col rawWidth-1-c', () => {
    expect(mirrorCrossWeaveBeadId('bead-1-0', RW)).toBe('bead-1-4');
    expect(mirrorCrossWeaveBeadId('bead-1-4', RW)).toBe('bead-1-0');
    expect(mirrorCrossWeaveBeadId('bead-1-2', RW)).toBe('bead-1-2');
  });
});

describe('mirrorCrossWeaveBeadId — vertical row (even r, rawWidth-1 beads)', () => {
  it('col c ↔ col rawWidth-2-c', () => {
    expect(mirrorCrossWeaveBeadId('bead-0-0', RW)).toBe('bead-0-3');
    expect(mirrorCrossWeaveBeadId('bead-0-3', RW)).toBe('bead-0-0');
  });
});

describe('mirrorCrossWeaveBeadId — unknown ids', () => {
  it('a garbage id → null', () => {
    expect(mirrorCrossWeaveBeadId('foobar', RW)).toBeNull();
  });
});

describe('shiftCrossWeaveDesignMapColumns — shift right (+1)', () => {
  const result = shiftCrossWeaveDesignMapColumns(
    {
      'bead-1-0': 'a', // горизонтальный, c→1, maxC=newW-1=5 → ok
      'bead-1-5': 'b', // c→6 > 5 → отброшен
      'bead-0-3': 'c', // вертикальный, c→4, maxC=newW-2=4 → ok
      'bead-0-4': 'd', // c→5 > 4 → отброшен
      'garbage-1-1': 'x', // неизвестный id → отброшен
    },
    1,
    6, // newRawWidth
  );

  it('preserves colors of shifted beads', () => {
    expect(result['bead-1-1']).toBe('a');
    expect(result['bead-0-4']).toBe('c');
  });

  it('drops everything that falls outside the grid, and unknown ids', () => {
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe('shiftCrossWeaveDesignMapColumns — shift left (-1)', () => {
  const result = shiftCrossWeaveDesignMapColumns(
    { 'bead-1-0': 'a', 'bead-0-0': 'b' },
    -1,
    RW,
  );

  it('columns going below 0 are dropped', () => {
    expect(Object.keys(result)).toHaveLength(0);
  });
});
