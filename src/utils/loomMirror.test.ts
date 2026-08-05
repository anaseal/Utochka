import { describe, it, expect } from 'vitest';
import { mirrorLoomBeadId, shiftLoomDesignMapColumns } from './loomMirror';

// width=5 — все ряды одной ширины и не сдвинуты, одна формула на все r.
const W = 5;

describe('mirrorLoomBeadId — same formula regardless of row parity', () => {
  it('col c ↔ col width-1-c on any row', () => {
    expect(mirrorLoomBeadId('loom-0-0', W)).toBe('loom-0-4');
    expect(mirrorLoomBeadId('loom-0-4', W)).toBe('loom-0-0');
    expect(mirrorLoomBeadId('loom-0-2', W)).toBe('loom-0-2');
    expect(mirrorLoomBeadId('loom-1-0', W)).toBe('loom-1-4');
    expect(mirrorLoomBeadId('loom-1-1', W)).toBe('loom-1-3');
  });
});

describe('mirrorLoomBeadId — unknown ids', () => {
  it('a garbage id → null', () => {
    expect(mirrorLoomBeadId('foobar', W)).toBeNull();
  });
});

describe('shiftLoomDesignMapColumns — shift right (+1)', () => {
  const result = shiftLoomDesignMapColumns(
    {
      'loom-0-0': 'a', // c→1, newWidth=6 → ok
      'loom-0-5': 'b', // c→6 >= 6 → отброшен
      'loom-1-4': 'c', // c→5, newWidth=6 → ok
      'garbage-1-1': 'x', // неизвестный id → отброшен
    },
    1,
    6, // newWidth
  );

  it('preserves colors of shifted beads', () => {
    expect(result['loom-0-1']).toBe('a');
    expect(result['loom-1-5']).toBe('c');
  });

  it('drops everything that falls outside the grid, and unknown ids', () => {
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe('shiftLoomDesignMapColumns — shift left (-1)', () => {
  const result = shiftLoomDesignMapColumns(
    { 'loom-1-0': 'a', 'loom-0-0': 'b' },
    -1,
    W,
  );

  it('columns going below 0 are dropped', () => {
    expect(Object.keys(result)).toHaveLength(0);
  });
});
