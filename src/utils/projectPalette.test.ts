import { describe, it, expect } from 'vitest';
import { extractProjectColors, isPaletteColors } from './projectPalette';
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

// Валидатор один на двоих: им проверяют прочитанное из localStorage настройки
// (useAppSettings) и палитру из записи проекта библиотека (projectLibrary).
// Разъедься они — библиотека записала бы палитру, которую настройки при чтении
// молча откатят к дефолтной.
describe('isPaletteColors', () => {
  it('accepts a non-empty list of #rrggbb colors', () => {
    expect(isPaletteColors(['#ff4757', '#22D3EE'])).toBe(true);
  });

  it('rejects an empty list — a palette with no colors is nothing to draw with', () => {
    expect(isPaletteColors([])).toBe(false);
  });

  it('rejects the transparent bead — it is a picker button, not a swatch', () => {
    expect(isPaletteColors([CLEAR_BEAD_COLOR])).toBe(false);
    expect(isPaletteColors(['#ff4757', CLEAR_BEAD_COLOR])).toBe(false);
  });

  it('rejects shorthand hex, named colors and non-strings', () => {
    expect(isPaletteColors(['#f00'])).toBe(false);
    expect(isPaletteColors(['red'])).toBe(false);
    expect(isPaletteColors(['#ff4757', 42])).toBe(false);
  });

  it('rejects anything that is not an array', () => {
    expect(isPaletteColors(null)).toBe(false);
    expect(isPaletteColors(undefined)).toBe(false);
    expect(isPaletteColors('#ff4757')).toBe(false);
    expect(isPaletteColors({ 0: '#ff4757' })).toBe(false);
  });
});
