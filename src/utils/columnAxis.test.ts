import { describe, it, expect } from 'vitest';
import { buildColumnAxis, computeMirrorAxisX } from './columnAxis';

describe('buildColumnAxis', () => {
  it('no points → empty axis', () => {
    expect(buildColumnAxis([], 6)).toEqual([]);
  });

  it('full range present: returns 0..width-2 unchanged, sorted by col', () => {
    const points = [
      { col: 3, x: 3 }, { col: 0, x: 0 }, { col: 2, x: 2 }, { col: 1, x: 1 }, { col: 4, x: 4 },
    ];
    expect(buildColumnAxis(points, 6)).toEqual([
      { col: 0, x: 0 }, { col: 1, x: 1 }, { col: 2, x: 2 }, { col: 3, x: 3 }, { col: 4, x: 4 },
    ]);
  });

  it('gaps (Taper cut some columns everywhere): extrapolates missing ones from the surviving step', () => {
    // width=6 → номинальный диапазон колонок 0..4. Живы только 1 и 3, шаг x=1
    // на col выводится из них же и достраивает 0, 2, 4 — линейка не должна
    // «стартовать с 2» только потому, что колонка 0 нигде не выжила.
    const points = [{ col: 1, x: 1 }, { col: 3, x: 3 }];
    expect(buildColumnAxis(points, 6)).toEqual([
      { col: 0, x: 0 }, { col: 1, x: 1 }, { col: 2, x: 2 }, { col: 3, x: 3 }, { col: 4, x: 4 },
    ]);
  });

  it('single surviving column: nothing to extrapolate from, returns just that one', () => {
    expect(buildColumnAxis([{ col: 2, x: 42 }], 10)).toEqual([{ col: 2, x: 42 }]);
  });

  it('duplicate col from different rows: first value wins, no crash', () => {
    const points = [{ col: 1, x: 1 }, { col: 1, x: 999 }, { col: 3, x: 3 }];
    const result = buildColumnAxis(points, 6);
    expect(result.find(p => p.col === 1)).toEqual({ col: 1, x: 1 });
  });

  it('points outside [0, width-2] are ignored', () => {
    const points = [{ col: -1, x: -1 }, { col: 1, x: 1 }, { col: 3, x: 3 }, { col: 5, x: 5 }];
    // width=6 → допустимый диапазон 0..4, так что col=-1 и col=5 не участвуют
    // ни в подборе шага, ни в результате.
    expect(buildColumnAxis(points, 6)).toEqual([
      { col: 0, x: 0 }, { col: 1, x: 1 }, { col: 2, x: 2 }, { col: 3, x: 3 }, { col: 4, x: 4 },
    ]);
  });

  it('non-adjacent known columns still yield the correct per-column step', () => {
    // Шаг между col=2 и col=5 — 15 на 3 колонки, т.е. 5 на колонку.
    const points = [{ col: 2, x: 20 }, { col: 5, x: 35 }];
    expect(buildColumnAxis(points, 8)).toEqual([
      { col: 0, x: 10 }, { col: 1, x: 15 }, { col: 2, x: 20 }, { col: 3, x: 25 },
      { col: 4, x: 30 }, { col: 5, x: 35 }, { col: 6, x: 40 },
    ]);
  });
});

describe('computeMirrorAxisX', () => {
  // Узлы нечётного ряда стоят на полшага правее своего индекса: при stepX=10
  // колонка 0 это x=5, колонка width-2=4 это x=45 — середина полотна 25, она
  // же половина ширины чётного ряда (5 колонок × 10 / 2).
  const axis = [
    { col: 0, x: 5 }, { col: 1, x: 15 }, { col: 2, x: 25 }, { col: 3, x: 35 }, { col: 4, x: 45 },
  ];

  it('полная ось → середина номинальной ширины', () => {
    expect(computeMirrorAxisX(axis, 6)).toBe(25);
  });

  it('Taper срезал крайние колонки — ось та же (buildColumnAxis их достроил)', () => {
    const points = [{ col: 1, x: 15 }, { col: 3, x: 35 }];
    expect(computeMirrorAxisX(buildColumnAxis(points, 6), 6)).toBe(25);
  });

  it('уцелела одна колонка → null (ось строить не из чего)', () => {
    expect(computeMirrorAxisX(buildColumnAxis([{ col: 2, x: 25 }], 6), 6)).toBeNull();
  });

  it('ширина 1 → null', () => {
    expect(computeMirrorAxisX([{ col: 0, x: 5 }], 1)).toBeNull();
  });
});
