import { describe, it, expect } from 'vitest';
import { buildBeadPositionIndex } from './beadPositions';
import { computeToothMesh, toothBeadId, type ToothMesh } from './tooth';
import { computeChainBeadPositions, chainBeadId } from './pendantChain';
import { decorTailBeadId } from './decorTail';
import { pendantBeadId } from './floodFill';
import { PENDANT_SCALE } from '../data/pendantTemplates';
import { Bead } from '../types/bead';
import {
  PendantTemplate, PendantPlacement, PendantChain, DecorTailPlacement, ToothPlacement,
} from '../types/pendant';

const node = (col: number, x: number, y = 100): Bead => ({
  id: `node-2-${col}`, x, y, type: 'NODE', logicalIndex: { row: 2, col },
});

const template: PendantTemplate = {
  id: 'drop',
  name: 'Drop',
  beads: [
    { dx: 0, dy: 18, shape: 'circle', type: 'NODE' },
    { dx: 9, dy: 36, shape: 'circle', type: 'SPAN' },
  ],
  links: [[0, 1]],
};

const pendant = (anchor: PendantPlacement['anchor']): PendantPlacement => ({
  placementId: 'p1', templateId: 'drop', anchor, colorMap: {},
});

// Слои независимы: у каждого свой аргумент и своё пространство id, поэтому
// тест задаёт только тот слой, о котором говорит, а остальные остаются пустыми.
interface Layers {
  beads?: Bead[];
  pendants?: PendantPlacement[];
  templates?: Record<string, PendantTemplate>;
  pendantAnchorNodes?: Bead[];
  chains?: PendantChain[];
  bottomNodes?: Bead[];
  tails?: DecorTailPlacement[];
  decorRowStep?: number;
  teeth?: ToothPlacement[];
  toothMeshes?: Map<string, ToothMesh>;
}

const buildIndex = (layers: Layers = {}) => buildBeadPositionIndex(
  layers.beads ?? [],
  layers.pendants ?? [],
  layers.templates ?? { drop: template },
  layers.pendantAnchorNodes ?? [],
  layers.chains ?? [],
  layers.bottomNodes ?? [],
  layers.tails ?? [],
  layers.decorRowStep ?? 22,
  layers.teeth ?? [],
  layers.toothMeshes ?? new Map(),
);

describe('сетка', () => {
  it('maps every grid bead to its own coordinates', () => {
    const index = buildIndex({ beads: [node(0, 0), node(1, 65)] });
    expect(index.get('node-2-0')).toEqual({ x: 0, y: 100 });
    expect(index.get('node-2-1')).toEqual({ x: 65, y: 100 });
    expect(index.size).toBe(2);
  });
});

describe('точечные подвески', () => {
  it('offsets template beads from the anchor by dx/dy scaled by PENDANT_SCALE', () => {
    const index = buildIndex({
      pendants: [pendant({ kind: 'grid', col: 1 })],
      pendantAnchorNodes: [node(1, 65)],
    });
    expect(index.get(pendantBeadId('p1', 0))).toEqual({ x: 65, y: 100 + 18 * PENDANT_SCALE });
    expect(index.get(pendantBeadId('p1', 1)))
      .toEqual({ x: 65 + 9 * PENDANT_SCALE, y: 100 + 36 * PENDANT_SCALE });
  });

  it('anchors on pendantAnchorNodes, not on bottomNodes', () => {
    // Подвеска висит на якоре колонки — это либо настоящая нода, либо кончик
    // декор-хвоста той же колонки. Цепочки и хвосты крепятся к самой ноде,
    // поэтому у двух списков одна колонка и разные координаты.
    const index = buildIndex({
      pendants: [pendant({ kind: 'grid', col: 1 })],
      pendantAnchorNodes: [node(1, 65, 300)],
      bottomNodes: [node(1, 65, 100)],
    });
    expect(index.get(pendantBeadId('p1', 0))).toEqual({ x: 65, y: 300 + 18 * PENDANT_SCALE });
  });

  it('anchors on a tooth mesh bead addressed by beadIndex', () => {
    const mesh = computeToothMesh(0, 2, 100, 65, 22, 0);
    const tip = mesh.beads[mesh.tipIndex];
    const index = buildIndex({
      pendants: [pendant({ kind: 'tooth', placementId: 'z1', beadIndex: mesh.tipIndex })],
      toothMeshes: new Map([['z1', mesh]]),
    });
    expect(index.get(pendantBeadId('p1', 0))).toEqual({ x: tip.x, y: tip.y + 18 * PENDANT_SCALE });
  });

  it('skips a pendant whose template is gone', () => {
    const index = buildIndex({
      pendants: [pendant({ kind: 'grid', col: 1 })],
      templates: {},
      pendantAnchorNodes: [node(1, 65)],
    });
    expect(index.size).toBe(0);
  });

  it('skips a pendant whose anchor no longer resolves', () => {
    const index = buildIndex({ pendants: [pendant({ kind: 'grid', col: 1 })] });
    expect(index.size).toBe(0);
  });
});

describe('цепочки-подвески', () => {
  const chain: PendantChain = {
    placementId: 'c1',
    start: { kind: 'grid', col: 0 },
    end: { kind: 'grid', col: 2 },
    colorMap: {},
  };

  it('lays chain beads along the sagging arc between its two endpoints', () => {
    const start = node(0, 0);
    const end = node(2, 130);
    const index = buildIndex({ chains: [chain], bottomNodes: [start, end] });

    const expected = computeChainBeadPositions(start, end);
    expect(expected.length).toBeGreaterThan(0);
    expected.forEach((pos, i) => {
      expect(index.get(chainBeadId('c1', i))).toEqual(pos);
    });
    expect(index.size).toBe(expected.length);
  });

  it('resolves an endpoint on a tooth mesh bead', () => {
    const mesh = computeToothMesh(0, 2, 100, 65, 22, 0);
    const end = node(4, 260);
    const index = buildIndex({
      chains: [{
        ...chain,
        start: { kind: 'tooth', placementId: 'z1', beadIndex: mesh.tipIndex },
        end: { kind: 'grid', col: 4 },
      }],
      bottomNodes: [end],
      toothMeshes: new Map([['z1', mesh]]),
    });
    const tip = mesh.beads[mesh.tipIndex];
    expect(index.get(chainBeadId('c1', 0))).toEqual(computeChainBeadPositions(tip, end)[0]);
  });

  it('skips a chain with an endpoint that no longer resolves', () => {
    // bottomNodes — только карта якорей: в индекс попадают бисерины слоёв,
    // а не узлы, за которые те держатся.
    const index = buildIndex({ chains: [chain], bottomNodes: [node(0, 0)] });
    expect(index.size).toBe(0);
  });
});

describe('декор-хвосты', () => {
  const tail: DecorTailPlacement = { placementId: 't1', col: 1, rows: 3, colorMap: {} };

  it('hangs beads straight under the bottom node, one decorRowStep apart', () => {
    const index = buildIndex({ tails: [tail], bottomNodes: [node(1, 65)], decorRowStep: 22 });
    expect(index.get(decorTailBeadId('t1', 0))).toEqual({ x: 65, y: 122 });
    expect(index.get(decorTailBeadId('t1', 1))).toEqual({ x: 65, y: 144 });
    expect(index.get(decorTailBeadId('t1', 2))).toEqual({ x: 65, y: 166 });
    expect(index.size).toBe(3);
  });

  it('skips a tail on a column with no bottom node', () => {
    expect(buildIndex({ tails: [tail] }).size).toBe(0);
  });
});

describe('зубцы', () => {
  const tooth: ToothPlacement = { placementId: 'z1', startCol: 0, endCol: 2, colorMap: {} };

  it('maps mesh beads by their flat index', () => {
    const mesh = computeToothMesh(0, 2, 100, 65, 22, 0);
    const index = buildIndex({ teeth: [tooth], toothMeshes: new Map([['z1', mesh]]) });
    expect(index.size).toBe(mesh.beads.length);
    mesh.beads.forEach((bead, i) => {
      expect(index.get(toothBeadId('z1', i))).toEqual({ x: bead.x, y: bead.y });
    });
  });

  it('skips a tooth with no computed mesh', () => {
    expect(buildIndex({ teeth: [tooth] }).size).toBe(0);
  });
});

describe('все слои вместе', () => {
  it('keeps one entry per bead — id namespaces of the layers do not collide', () => {
    const mesh = computeToothMesh(0, 2, 100, 65, 22, 0);
    const start = node(0, 0);
    const end = node(2, 130);
    const index = buildIndex({
      beads: [start, end],
      pendants: [pendant({ kind: 'grid', col: 0 })],
      pendantAnchorNodes: [start],
      chains: [{
        placementId: 'c1', start: { kind: 'grid', col: 0 }, end: { kind: 'grid', col: 2 }, colorMap: {},
      }],
      bottomNodes: [start, end],
      tails: [{ placementId: 't1', col: 2, rows: 3, colorMap: {} }],
      teeth: [{ placementId: 'z1', startCol: 0, endCol: 2, colorMap: {} }],
      toothMeshes: new Map([['z1', mesh]]),
    });

    const chainCount = computeChainBeadPositions(start, end).length;
    expect(index.size).toBe(2 + template.beads.length + chainCount + 3 + mesh.beads.length);
  });
});
