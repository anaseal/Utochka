import { describe, it, expect } from 'vitest';
import { resolveSpanCount, clampSpan } from './spans';

describe('resolveSpanCount', () => {
  it('чётный ряд без override → bottomSpan (ножки)', () => {
    expect(resolveSpanCount(0, 5, 7)).toBe(7);
    expect(resolveSpanCount(2, 5, 7)).toBe(7);
  });

  it('нечётный ряд без override → topSpan (плечи)', () => {
    expect(resolveSpanCount(1, 5, 7)).toBe(5);
    expect(resolveSpanCount(3, 5, 7)).toBe(5);
  });

  it('override приоритетнее чётности ряда', () => {
    expect(resolveSpanCount(0, 5, 7, { 0: 9 })).toBe(9);
    expect(resolveSpanCount(1, 5, 7, { 1: 4 })).toBe(4);
  });

  it('override одного ряда не влияет на соседние', () => {
    const overrides = { 2: 8 };
    expect(resolveSpanCount(2, 5, 7, overrides)).toBe(8);
    expect(resolveSpanCount(0, 5, 7, overrides)).toBe(7);
    expect(resolveSpanCount(1, 5, 7, overrides)).toBe(5);
  });

  it('ключ -1 (верхняя кромка) читается из overrides, иначе как нечётный', () => {
    // r=-1: -1 % 2 === -1 !== 0 → ветка topSpan
    expect(resolveSpanCount(-1, 5, 7)).toBe(5);
    expect(resolveSpanCount(-1, 5, 7, { [-1]: 6 })).toBe(6);
  });

  it('override === 0 не подменяется дефолтом (?? , не ||)', () => {
    expect(resolveSpanCount(0, 5, 7, { 0: 0 })).toBe(0);
  });
});

describe('clampSpan', () => {
  it('значение внутри диапазона не меняется', () => {
    expect(clampSpan(3)).toBe(3);
    expect(clampSpan(7)).toBe(7);
    expect(clampSpan(10)).toBe(10);
  });

  it('ниже minSpan (3) → 3', () => {
    expect(clampSpan(2)).toBe(3);
    expect(clampSpan(-100)).toBe(3);
  });

  it('выше maxSpan (10) → 10', () => {
    expect(clampSpan(11)).toBe(10);
    expect(clampSpan(999)).toBe(10);
  });
});
