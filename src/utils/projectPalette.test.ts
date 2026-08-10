import { describe, it, expect } from 'vitest';
import { extractProjectColors } from './projectPalette';
import { CLEAR_BEAD_COLOR } from '../config/theme';

describe('extractProjectColors', () => {
  it('counts colors across every source', () => {
    expect(extractProjectColors([
      { a: '#ff4757', b: '#ff4757', c: '#22d3ee' },
      { 0: '#22d3ee', 1: '#22d3ee' },
    ])).toEqual([
      ['#22d3ee', 3],
      ['#ff4757', 2],
    ]);
  });

  it('sorts by count descending, then by hex for a stable order', () => {
    expect(extractProjectColors([
      { a: '#ffffff', b: '#000000', c: '#22d3ee', d: '#22d3ee' },
    ])).toEqual([
      ['#22d3ee', 2],
      ['#000000', 1],
      ['#ffffff', 1],
    ]);
  });

  it('merges colors that differ only in letter case', () => {
    expect(extractProjectColors([{ a: '#FF4757', b: '#ff4757' }]))
      .toEqual([['#ff4757', 2]]);
  });

  it('drops the transparent bead — the palette only accepts #rrggbb', () => {
    expect(extractProjectColors([{ a: CLEAR_BEAD_COLOR, b: '#ff4757' }]))
      .toEqual([['#ff4757', 1]]);
  });

  it('drops non-hex values', () => {
    expect(extractProjectColors([{ a: 'transparent', b: 'red', c: '#f00', d: '#ff4757' }]))
      .toEqual([['#ff4757', 1]]);
  });

  it('skips undefined sources', () => {
    expect(extractProjectColors([undefined, { a: '#ff4757' }, undefined]))
      .toEqual([['#ff4757', 1]]);
  });

  it('returns an empty list for an unpainted project', () => {
    expect(extractProjectColors([{}])).toEqual([]);
    expect(extractProjectColors([])).toEqual([]);
  });
});
