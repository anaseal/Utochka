import { describe, it, expect } from 'vitest';
import { getTaperColumnCuts } from './taper';
import { Taper } from '../types/bead';
import { getColumnRange } from './columnRange';

const noTaper: Taper = { top: { rows: 0 }, bottom: { rows: 0 }, depth: 0 };

const WIDTH = 12;

// Границы ряда при обоих включённых Edge Extension (дефолт): нечётные
// (сдвинутые) ряды начинаются с -1, чётные — с 0; справа оба кончаются на
// width-1.
const cuts = (taper: Taper, r: number, height: number, width = WIDTH, exL = true, exR = true) => {
  const { minC, maxC } = getColumnRange(r, width, exL, exR);
  return getTaperColumnCuts(taper, r, height, width, minC, maxC);
};

const leftSequence = (taper: Taper, height: number, width = WIDTH): number[] => {
  const out: number[] = [];
  for (let r = 0; r <= 2 * height; r++) out.push(cuts(taper, r, height, width).left);
  return out;
};

// Физическое положение крайних уцелевших узлов ряда вдоль полотна (в
// колонках): у сдвинутых рядов узел стоит на полколонки правее своего индекса.
const aliveEdges = (taper: Taper, r: number, height: number, width = WIDTH, exL = true, exR = true) => {
  const { minC, maxC } = getColumnRange(r, width, exL, exR);
  const { left, right } = getTaperColumnCuts(taper, r, height, width, minC, maxC);
  const shift = r % 2 !== 0 ? 0.5 : 0;
  return { first: minC + left + shift, last: maxC - right + shift };
};

describe('getTaperColumnCuts', () => {
  it('inactive taper (rows=0, любой depth) → 0 с обеих сторон в каждом ряду', () => {
    for (let r = 0; r <= 16; r++) expect(cuts(noTaper, r, 8)).toEqual({ left: 0, right: 0 });
  });

  it('rows=0 отключает сторону целиком, даже если depth > 0', () => {
    // Именно поэтому степпер Depth в UI заблокирован, пока обе стороны с
    // rows=0: крутить его в этом состоянии бессмысленно (см. spec.md).
    const taper: Taper = { top: { rows: 0 }, bottom: { rows: 0 }, depth: 5 };
    for (let r = 0; r <= 16; r++) expect(cuts(taper, r, 8)).toEqual({ left: 0, right: 0 });
  });

  it('top-only: срез у кромки (r=0) равен rows, если depth его не перекрывает', () => {
    const taper: Taper = { top: { rows: 4 }, bottom: { rows: 0 }, depth: 0 };
    expect(cuts(taper, 0, 8).left).toBe(4);
  });

  it('top-only, depth=0: срез возвращается к 0 за пределами зоны (2·rows)', () => {
    const taper: Taper = { top: { rows: 4 }, bottom: { rows: 0 }, depth: 0 };
    expect(cuts(taper, 8, 8)).toEqual({ left: 0, right: 0 });
    expect(cuts(taper, 9, 8)).toEqual({ left: 0, right: 0 });
    expect(cuts(taper, 16, 8)).toEqual({ left: 0, right: 0 });
  });

  it('top-only, depth > 0: срез НЕ возвращается к 0 — общий пол depth/2 держится по всему полотну', () => {
    const taper: Taper = { top: { rows: 3 }, bottom: { rows: 0 }, depth: 1 };
    // пол = ceil(0.5) = 1 для любого ряда за пределами зоны ската, включая
    // противоположный (bottom) край — depth общий, а не локальный для top.
    expect(cuts(taper, 16, 8).left).toBe(1);
    expect(cuts(taper, 8, 8).left).toBe(1);
  });

  it('bottom-only: срез у кромки (r=2·height) равен rows', () => {
    const taper: Taper = { top: { rows: 0 }, bottom: { rows: 4 }, depth: 0 };
    expect(cuts(taper, 16, 8).left).toBe(4);
    expect(cuts(taper, 8, 8).left).toBe(0);
  });

  it('depth > 2×rows: общий пол перекрывает срез даже у самой кромки этой стороны', () => {
    // depth задаёт МИНИМАЛЬНУЮ ширину среза по всему полотну — если она больше
    // rows этой стороны, у кромки побеждает пол, а не rows (см. types/bead.ts).
    const taper: Taper = { top: { rows: 2 }, bottom: { rows: 0 }, depth: 6 };
    expect(cuts(taper, 0, 8).left).toBe(3);
  });

  it('соответствует проверенному примеру: rows=3, depth=1, height=8', () => {
    const taper: Taper = { top: { rows: 3 }, bottom: { rows: 3 }, depth: 1 };
    expect(leftSequence(taper, 8)).toEqual([
      3, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3,
    ]);
  });

  it('соответствует проверенному примеру: rows=1, depth=0, height=8', () => {
    const taper: Taper = { top: { rows: 1 }, bottom: { rows: 1 }, depth: 0 };
    expect(leftSequence(taper, 8)).toEqual([
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
    ]);
  });

  it('край не прыгает больше чем на колонку между соседними рядами', () => {
    // Целевая линия непрерывна и убывает максимум на 0.5 колонки за ряд,
    // поэтому и физический край полотна не может сместиться больше чем на
    // колонку — иначе силуэт «зубчатый» (см. spec.md).
    const taper: Taper = { top: { rows: 4 }, bottom: { rows: 4 }, depth: 3 };
    for (let r = 1; r <= 16; r++) {
      const prev = aliveEdges(taper, r - 1, 8);
      const cur = aliveEdges(taper, r, 8);
      expect(Math.abs(cur.first - prev.first)).toBeLessThanOrEqual(1);
      expect(Math.abs(cur.last - prev.last)).toBeLessThanOrEqual(1);
    }
  });

  it('при симметричном Edge Extension обе стороны срезаются одинаково', () => {
    const taper: Taper = { top: { rows: 3 }, bottom: { rows: 3 }, depth: 4 };
    for (let r = 0; r <= 16; r++) {
      const { left, right } = cuts(taper, r, 8);
      expect(left).toBe(right);
    }
  });

  it('при АСИММЕТРИЧНОМ Edge Extension обе кромки всё равно ложатся на свою целевую линию', () => {
    // Ключевой регресс-тест: пока срез был общим для двух сторон, правый край
    // при выключенном левом расширении уезжал на полколонки, и у края
    // оставались узлы без единого пролёта (см. taper.ts).
    const taper: Taper = { top: { rows: 2 }, bottom: { rows: 2 }, depth: 2 };
    const height = 5;
    for (const [exL, exR] of [[true, true], [false, true], [true, false], [false, false]] as const) {
      for (let r = 0; r <= 2 * height; r++) {
        const { first, last } = aliveEdges(taper, r, height, WIDTH, exL, exR);
        const target = Math.max(
          Math.max(taper.depth / 2, taper.top.rows - r / 2),
          Math.max(taper.depth / 2, taper.bottom.rows - (2 * height - r) / 2),
        );
        // Уцелевшие узлы не заходят внутрь целевой линии...
        expect(first).toBeGreaterThanOrEqual(target);
        expect(last).toBeLessThanOrEqual(WIDTH - 1 - target);
        // ...и срезано не больше необходимого (иначе ряд «проваливается»
        // внутрь и его крайний узел остаётся без соседей в соседних рядах).
        expect(first).toBeLessThan(target + 1);
        expect(last).toBeGreaterThan(WIDTH - 1 - target - 1);
      }
    }
  });
});
