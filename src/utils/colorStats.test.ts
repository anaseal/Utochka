import { describe, it, expect } from 'vitest';
import { computeColorStats } from './colorStats';
import { CLEAR_BEAD_COLOR, defaultColorFor } from '../config/theme';
import { BeadType } from '../types/bead';

const bead = (id: string, type: BeadType = 'SPAN') => ({ id, type });
const defaultColorOf = (b: { type: BeadType }) => defaultColorFor(b.type);

describe('computeColorStats', () => {
  it('counts beads per color', () => {
    const stats = computeColorStats(
      [bead('a'), bead('b'), bead('c')],
      { a: '#ff4757', b: '#ff4757', c: '#22d3ee' },
      defaultColorOf,
    );
    expect(stats.get('#ff4757')).toBe(2);
    expect(stats.get('#22d3ee')).toBe(1);
  });

  // Прозрачный и незакрашенный бисер — одно и то же состояние изделия, и в
  // спецификации это одна строка «столько прозрачного бисера». Две отдельные
  // строки читались бы как два разных материала.
  it('puts transparent and unpainted beads in the same bucket', () => {
    const stats = computeColorStats(
      [bead('a'), bead('b'), bead('c')],
      { a: CLEAR_BEAD_COLOR },
      defaultColorOf,
    );
    expect(stats.get('transparent')).toBe(3);
    expect(stats.size).toBe(1);
  });

  it('falls back per item — the default color is asked for each bead separately', () => {
    const stats = computeColorStats(
      [bead('a', 'NODE'), bead('b', 'SPAN')],
      {},
      (b) => (b.type === 'NODE' ? 'node-default' : 'span-default'),
    );
    expect(stats.get('node-default')).toBe(1);
    expect(stats.get('span-default')).toBe(1);
  });

  it('returns an empty map for an empty bead list', () => {
    expect(computeColorStats([], {}, defaultColorOf).size).toBe(0);
  });

  // Map отдаётся мутируемым намеренно: вызывающий досыпает в него свои слои
  // (подвески силянки) поверх базового прохода по сетке.
  it('returns a map the caller can extend with its own layers', () => {
    const stats = computeColorStats([bead('a')], { a: '#ff4757' }, defaultColorOf);
    stats.set('#ff4757', (stats.get('#ff4757') ?? 0) + 5);
    expect(stats.get('#ff4757')).toBe(6);
  });
});
