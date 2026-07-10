import { describe, it, expect } from 'vitest';
import { computeUnifiedFloodFill } from './floodFill';
import { generateSilyankaGrid } from './generator';
import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate } from '../types/pendant';

// Маленькая реальная сетка: width=3, height=1, span 3/3 (internal=1).
const beads: Bead[] = generateSilyankaGrid(3, 1, 65, 3, 3);
const bottomNodes = beads.filter(
  b => b.type === 'NODE' && b.logicalIndex.row === 2,
);

const noPendants: PendantPlacement[] = [];
const noTemplates: Record<string, PendantTemplate> = {};

describe('computeUnifiedFloodFill — базовое поведение сетки', () => {
  it('startColor === activeColor → пустой результат (нечего заливать)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      { 'node-0-0': 'red' },
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
    );
    expect(res).toEqual({ gridIds: [], pendantHits: [] });
  });

  it('равномерно прозрачная сетка заливается целиком (граф связен)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      {},
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
    );
    expect(new Set(res.gridIds)).toEqual(new Set(beads.map(b => b.id)));
    expect(res.pendantHits).toHaveLength(0);
  });

  it('бисерина другого цвета не попадает в заливку (барьер)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      { 'node-0-1': 'blue' }, // сосед покрашен иначе
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
    );
    expect(res.gridIds).not.toContain('node-0-1');
    // остальная прозрачная сетка всё равно залита
    expect(res.gridIds).toContain('node-0-0');
    expect(res.gridIds.length).toBeGreaterThan(1);
  });
});

describe('computeUnifiedFloodFill — переход сетка ↔ подвеска', () => {
  const template: PendantTemplate = {
    id: 't1',
    name: 'test',
    beads: [
      { dx: 0, dy: 10, shape: 'circle', type: 'SPAN' },
      { dx: 0, dy: 20, shape: 'circle', type: 'SPAN' },
    ],
    links: [[0, 1]],
  };
  const templates = { t1: template };
  // Якорь — нода нижнего ряда в колонке 1.
  const placement: PendantPlacement = {
    placementId: 'p1',
    templateId: 't1',
    col: 1,
    colorMap: {},
  };

  it('заливка перетекает через якорную ноду в бусины подвески', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [placement],
      templates,
      bottomNodes,
    );
    expect(res.pendantHits).toEqual(
      expect.arrayContaining([
        { placementId: 'p1', index: 0 },
        { placementId: 'p1', index: 1 },
      ]),
    );
  });

  it('подвеска с иным цветом якорной бусины не заливается', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [{ ...placement, colorMap: { 0: 'blue' } }],
      templates,
      bottomNodes,
    );
    expect(res.pendantHits).toHaveLength(0);
  });
});
