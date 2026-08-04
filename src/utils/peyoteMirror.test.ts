import { describe, it, expect } from 'vitest';
import { mirrorPeyoteBeadId, shiftPeyoteDesignMapColumns } from './peyoteMirror';

// width=5 — все ряды одной ширины (в отличие от crossWeave, где чётность
// ряда меняет и ширину, и формулу зеркала), поэтому одна формула на все r.
const W = 5;

describe('mirrorPeyoteBeadId — same formula regardless of row parity', () => {
  it('col c ↔ col width-1-c on an even row', () => {
    expect(mirrorPeyoteBeadId('peyote-0-0', W)).toBe('peyote-0-4');
    expect(mirrorPeyoteBeadId('peyote-0-4', W)).toBe('peyote-0-0');
    expect(mirrorPeyoteBeadId('peyote-0-2', W)).toBe('peyote-0-2');
  });

  it('col c ↔ col width-1-c on an odd row too', () => {
    expect(mirrorPeyoteBeadId('peyote-1-0', W)).toBe('peyote-1-4');
    expect(mirrorPeyoteBeadId('peyote-1-1', W)).toBe('peyote-1-3');
  });
});

describe('mirrorPeyoteBeadId — unknown ids', () => {
  it('a garbage id → null', () => {
    expect(mirrorPeyoteBeadId('foobar', W)).toBeNull();
  });
});

describe('shiftPeyoteDesignMapColumns — shift right (+1)', () => {
  const result = shiftPeyoteDesignMapColumns(
    {
      'peyote-0-0': 'a', // c→1, newWidth=6 → ok
      'peyote-0-5': 'b', // c→6 >= 6 → отброшен
      'peyote-1-4': 'c', // c→5, newWidth=6 → ok
      'garbage-1-1': 'x', // неизвестный id → отброшен
    },
    1,
    6, // newWidth
  );

  it('preserves colors of shifted beads', () => {
    expect(result['peyote-0-1']).toBe('a');
    expect(result['peyote-1-5']).toBe('c');
  });

  it('drops everything that falls outside the grid, and unknown ids', () => {
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe('shiftPeyoteDesignMapColumns — shift left (-1)', () => {
  const result = shiftPeyoteDesignMapColumns(
    { 'peyote-1-0': 'a', 'peyote-0-0': 'b' },
    -1,
    W,
  );

  it('columns going below 0 are dropped', () => {
    expect(Object.keys(result)).toHaveLength(0);
  });
});
