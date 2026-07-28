import { describe, it, expect } from 'vitest';
import { computeUnifiedFloodFill } from './floodFill';
import { generateSilyankaGrid } from './generator';
import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate, DecorTailPlacement } from '../types/pendant';
import { decorTailBeadId } from './decorTail';

// Маленькая реальная сетка: width=3, height=1, span 3/3 (internal=1).
const beads: Bead[] = generateSilyankaGrid(3, 1, 65, 3, 3);
const bottomNodes = beads.filter(
  b => b.type === 'NODE' && b.logicalIndex.row === 2,
);

const noPendants: PendantPlacement[] = [];
const noTemplates: Record<string, PendantTemplate> = {};
describe('computeUnifiedFloodFill — basic grid behavior', () => {
  it('startColor === activeColor → empty result (nothing to fill)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      { 'node-0-0': 'red' },
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
    );
    expect(res).toEqual({ gridIds: [], pendantHits: [], chainHits: [], decorTailHits: [] });
  });

  it('uniformly transparent grid is filled entirely (graph is connected)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      {},
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
    );
    expect(new Set(res.gridIds)).toEqual(new Set(beads.map(b => b.id)));
    expect(res.pendantHits).toHaveLength(0);
  });

  it('a bead of a different color does not get filled (barrier)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      { 'node-0-1': 'blue' }, // сосед покрашен иначе
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
    );
    expect(res.gridIds).not.toContain('node-0-1');
    // остальная прозрачная сетка всё равно залита
    expect(res.gridIds).toContain('node-0-0');
    expect(res.gridIds.length).toBeGreaterThan(1);
  });
});

describe('computeUnifiedFloodFill — grid ↔ pendant transition', () => {
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

  it('fill flows through the anchor node into pendant beads', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [placement],
      templates,
      bottomNodes,
      bottomNodes,
    );
    expect(res.pendantHits).toEqual(
      expect.arrayContaining([
        { placementId: 'p1', index: 0 },
        { placementId: 'p1', index: 1 },
      ]),
    );
  });

  it('a pendant with a different anchor bead color is not filled', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [{ ...placement, colorMap: { 0: 'blue' } }],
      templates,
      bottomNodes,
      bottomNodes,
    );
    expect(res.pendantHits).toHaveLength(0);
  });
});

describe('computeUnifiedFloodFill — grid ↔ decor tail transition', () => {
  // Хвост длиной 2 на колонке 1 нижнего ряда.
  const tail: DecorTailPlacement = {
    placementId: 'd1',
    col: 1,
    rows: 2,
    colorMap: {},
  };

  it('fill flows through the anchor node into decor tail beads', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
      [],
      [tail],
    );
    expect(res.decorTailHits).toEqual(
      expect.arrayContaining([
        { placementId: 'd1', index: 0 },
        { placementId: 'd1', index: 1 },
      ]),
    );
  });

  it('a decor tail with a different anchor bead color is not filled', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
      [],
      [{ ...tail, colorMap: { 0: 'blue' } }],
    );
    expect(res.decorTailHits).toHaveLength(0);
  });

  it('a pendant anchored on a decor tail tip fills through the tail, not the node', () => {
    const template: PendantTemplate = {
      id: 't1',
      name: 'test',
      beads: [{ dx: 0, dy: 10, shape: 'circle', type: 'SPAN' }],
      links: [],
    };
    const placement: PendantPlacement = {
      placementId: 'p1',
      templateId: 't1',
      col: 1,
      colorMap: {},
    };
    // pendantAnchorNodes подменяет якорь колонки 1 на кончик хвоста (index 1) —
    // так же, как это делает pendantAnchors в useSilyankaProject.ts.
    const tailTipAnchor: Bead = {
      ...bottomNodes[1],
      id: decorTailBeadId('d1', 1),
    };
    const pendantAnchorNodes = bottomNodes.map(n => (n.logicalIndex.col === 1 ? tailTipAnchor : n));

    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [placement],
      { t1: template },
      pendantAnchorNodes,
      bottomNodes,
      [],
      [tail],
    );
    expect(res.decorTailHits).toEqual(
      expect.arrayContaining([
        { placementId: 'd1', index: 0 },
        { placementId: 'd1', index: 1 },
      ]),
    );
    expect(res.pendantHits).toEqual([{ placementId: 'p1', index: 0 }]);
  });
});
