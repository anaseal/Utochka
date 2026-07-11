import { describe, it, expect } from 'vitest';
import { resolveSpanCount, clampSpan } from './spans';

describe('resolveSpanCount', () => {
  it('even row without override → bottomSpan (legs)', () => {
    expect(resolveSpanCount(0, 5, 7)).toBe(7);
    expect(resolveSpanCount(2, 5, 7)).toBe(7);
  });

  it('odd row without override → topSpan (shoulders)', () => {
    expect(resolveSpanCount(1, 5, 7)).toBe(5);
    expect(resolveSpanCount(3, 5, 7)).toBe(5);
  });

  it('override takes priority over row parity', () => {
    expect(resolveSpanCount(0, 5, 7, { 0: 9 })).toBe(9);
    expect(resolveSpanCount(1, 5, 7, { 1: 4 })).toBe(4);
  });

  it('overriding one row does not affect neighbors', () => {
    const overrides = { 2: 8 };
    expect(resolveSpanCount(2, 5, 7, overrides)).toBe(8);
    expect(resolveSpanCount(0, 5, 7, overrides)).toBe(7);
    expect(resolveSpanCount(1, 5, 7, overrides)).toBe(5);
  });

  it('key -1 (top edge) is read from overrides, otherwise treated as odd', () => {
    // r=-1: -1 % 2 === -1 !== 0 → ветка topSpan
    expect(resolveSpanCount(-1, 5, 7)).toBe(5);
    expect(resolveSpanCount(-1, 5, 7, { [-1]: 6 })).toBe(6);
  });

  it('override === 0 is not replaced by the default (?? , not ||)', () => {
    expect(resolveSpanCount(0, 5, 7, { 0: 0 })).toBe(0);
  });
});

describe('clampSpan', () => {
  it('a value within range is unchanged', () => {
    expect(clampSpan(3)).toBe(3);
    expect(clampSpan(7)).toBe(7);
    expect(clampSpan(10)).toBe(10);
  });

  it('below minSpan (3) → 3', () => {
    expect(clampSpan(2)).toBe(3);
    expect(clampSpan(-100)).toBe(3);
  });

  it('above maxSpan (10) → 10', () => {
    expect(clampSpan(11)).toBe(10);
    expect(clampSpan(999)).toBe(10);
  });
});
