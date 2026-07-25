import { describe, it, expect } from 'vitest';
import { getTaperColumnCut } from './taper';
import { Taper } from '../types/bead';

const noTaper: Taper = { top: { rows: 0 }, bottom: { rows: 0 }, depth: 0 };

// minC(r) для extendLeft=true (стандартный случай в тестах ниже): нечётные
// (сдвинутые) ряды начинаются с -1, чётные — с 0.
const minCExtended = (r: number): number => (r % 2 !== 0 ? -1 : 0);

const sequence = (taper: Taper, height: number, minC: (r: number) => number = minCExtended): number[] => {
  const out: number[] = [];
  for (let r = 0; r <= 2 * height; r++) out.push(getTaperColumnCut(taper, r, height, minC(r)));
  return out;
};

// Целевая линия непрерывна и убывает максимум на 0.5 колонки за ряд —
// целочисленный срез, округлённый вверх до неё, не может прыгнуть больше
// чем на 1 колонку между соседними рядами.
const hasNoBigJumps = (values: number[]): boolean => {
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - values[i - 1]) > 1) return false;
  }
  return true;
};

describe('getTaperColumnCut', () => {
  it('inactive taper (rows=0, любой depth) → 0 at every row', () => {
    expect(sequence(noTaper, 8)).toEqual(new Array(17).fill(0));
  });

  it('rows=0 отключает сторону целиком, даже если depth > 0', () => {
    const taper: Taper = { top: { rows: 0 }, bottom: { rows: 0 }, depth: 5 };
    expect(sequence(taper, 8)).toEqual(new Array(17).fill(0));
  });

  it('top-only: срез у кромки (r=0) равен rows, если depth его не перекрывает', () => {
    const taper: Taper = { top: { rows: 4 }, bottom: { rows: 0 }, depth: 0 };
    expect(getTaperColumnCut(taper, 0, 8, minCExtended(0))).toBe(4);
  });

  it('top-only, depth=0: срез возвращается к 0 за пределами зоны (2·rows)', () => {
    const taper: Taper = { top: { rows: 4 }, bottom: { rows: 0 }, depth: 0 };
    expect(getTaperColumnCut(taper, 8, 8, minCExtended(8))).toBe(0);
    expect(getTaperColumnCut(taper, 9, 8, minCExtended(9))).toBe(0);
    expect(getTaperColumnCut(taper, 16, 8, minCExtended(16))).toBe(0);
  });

  it('top-only, depth > 0: срез НЕ возвращается к 0 — общий пол depth/2 держится по всему полотну', () => {
    const taper: Taper = { top: { rows: 3 }, bottom: { rows: 0 }, depth: 1 };
    const values = sequence(taper, 8);
    // пол = ceil(0.5) = 1 для любого ряда за пределами зоны ската, включая
    // противоположный (bottom) край — depth общий, а не локальный для top.
    expect(values[values.length - 1]).toBe(1);
    expect(values[8]).toBe(1);
  });

  it('top-only taper не даёт скачков больше 1 колонки между соседними рядами', () => {
    const taper: Taper = { top: { rows: 4 }, bottom: { rows: 0 }, depth: 3 };
    expect(hasNoBigJumps(sequence(taper, 8))).toBe(true);
  });

  it('bottom-only: срез у кромки (r=2·height) равен rows', () => {
    const taper: Taper = { top: { rows: 0 }, bottom: { rows: 4 }, depth: 0 };
    expect(getTaperColumnCut(taper, 16, 8, minCExtended(16))).toBe(4);
    expect(getTaperColumnCut(taper, 8, 8, minCExtended(8))).toBe(0);
  });

  it('both sides active: комбинируются через max, без скачков больше 1 колонки', () => {
    const taper: Taper = { top: { rows: 3 }, bottom: { rows: 3 }, depth: 4 };
    expect(hasNoBigJumps(sequence(taper, 8))).toBe(true);
  });

  it('overlapping zones (большой rows с обеих сторон) — общий depth побеждает через max на стыке', () => {
    const height = 4;
    const taper: Taper = { top: { rows: height + 1 }, bottom: { rows: height + 1 }, depth: 5 };
    const values = sequence(taper, height);
    expect(hasNoBigJumps(values)).toBe(true);
    expect(values[values.length - 1]).toBe(5);
  });

  it('depth > 2×rows: общий пол перекрывает срез даже у самой кромки этой стороны', () => {
    // depth задаёт МИНИМАЛЬНУЮ ширину среза по всему полотну — если она больше
    // rows этой стороны, у кромки побеждает пол, а не rows (см. types/bead.ts).
    const taper: Taper = { top: { rows: 2 }, bottom: { rows: 0 }, depth: 6 };
    expect(getTaperColumnCut(taper, 0, 8, minCExtended(0))).toBe(3);
  });

  it('соответствует проверенному примеру: rows=3, depth=1, height=8, extendLeft=true', () => {
    const taper: Taper = { top: { rows: 3 }, bottom: { rows: 3 }, depth: 1 };
    expect(sequence(taper, 8)).toEqual([
      3, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3,
    ]);
  });

  it('соответствует проверенному примеру: rows=1, depth=0, height=8, extendLeft=true', () => {
    const taper: Taper = { top: { rows: 1 }, bottom: { rows: 1 }, depth: 0 };
    expect(sequence(taper, 8)).toEqual([
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
    ]);
  });
});
