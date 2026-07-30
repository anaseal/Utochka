import { describe, it, expect } from 'vitest';
import { computeSilyankaExtraMaxY } from './pendantCanvasDim';
import { PENDANT_SCALE } from '../data/pendantTemplates';
import { Bead } from '../types/bead';
import { PendantTemplate, PendantPlacement, PendantChain, DecorTailPlacement, ToothPlacement } from '../types/pendant';
import { computeToothMeshes } from './tooth';

const makeNode = (col: number, y = 0): Bead => ({
  id: `node:0:${col}`, x: col * 65, y, type: 'NODE', logicalIndex: { row: 0, col },
});

const NO_TEETH: ToothPlacement[] = [];
const NO_TOOTH_MESHES = new Map();

describe('computeSilyankaExtraMaxY', () => {
  it('returns 0 when nothing is placed', () => {
    expect(computeSilyankaExtraMaxY([], {}, [], [], [], [], 20, NO_TEETH, NO_TOOTH_MESHES)).toBe(0);
  });

  it('accounts for a pendant depth below its anchor', () => {
    const template: PendantTemplate = {
      id: 't1', name: 'T1', links: [],
      beads: [{ dx: 0, dy: 10, shape: 'circle', type: 'NODE', r: 4 }],
    };
    const placement: PendantPlacement = { placementId: 'p1', templateId: 't1', col: 0, colorMap: {} };
    const anchor = makeNode(0, 100);
    const result = computeSilyankaExtraMaxY(
      [placement], { t1: template }, [anchor], [], [], [], 20, NO_TEETH, NO_TOOTH_MESHES,
    );
    expect(result).toBeCloseTo(anchor.y + 14 * PENDANT_SCALE + 26);
  });

  it('ignores a placement with no matching template or anchor', () => {
    const placement: PendantPlacement = { placementId: 'p1', templateId: 'missing', col: 0, colorMap: {} };
    expect(computeSilyankaExtraMaxY(
      [placement], {}, [makeNode(0, 100)], [], [], [], 20, NO_TEETH, NO_TOOTH_MESHES,
    )).toBe(0);
  });

  it('accounts for chain sag between two bottom nodes', () => {
    const start = makeNode(0, 100);
    const end = makeNode(5, 100);
    const chain: PendantChain = {
      placementId: 'c1', start: { kind: 'grid', col: 0 }, end: { kind: 'grid', col: 5 }, colorMap: {},
    };
    const result = computeSilyankaExtraMaxY(
      [], {}, [], [chain], [start, end], [], 20, NO_TEETH, NO_TOOTH_MESHES,
    );
    expect(result).toBeGreaterThan(100 + 26 - 1);
  });

  it('accounts for a decor tail hanging straight down', () => {
    const anchor = makeNode(0, 100);
    const tail: DecorTailPlacement = { placementId: 'd1', col: 0, rows: 3, colorMap: {} };
    const result = computeSilyankaExtraMaxY(
      [], {}, [], [], [anchor], [tail], 20, NO_TEETH, NO_TOOTH_MESHES,
    );
    expect(result).toBe(100 + 3 * 20 + 26);
  });

  it('takes the max across all four layers', () => {
    const anchor = makeNode(0, 100);
    const tail: DecorTailPlacement = { placementId: 'd1', col: 0, rows: 1, colorMap: {} };
    const tallTail: DecorTailPlacement = { placementId: 'd2', col: 1, rows: 10, colorMap: {} };
    const result = computeSilyankaExtraMaxY(
      [], {}, [], [], [anchor, makeNode(1, 100)], [tail, tallTail], 20, NO_TEETH, NO_TOOTH_MESHES,
    );
    expect(result).toBe(100 + 10 * 20 + 26);
  });

  it('accounts for a tooth mesh converging below the bottom row', () => {
    const bottomNodes = [makeNode(0, 100), makeNode(1, 100), makeNode(2, 100)];
    const tooth: ToothPlacement = { placementId: 'z1', startCol: 0, endCol: 2, colorMap: {} };
    const toothMeshes = computeToothMeshes([tooth], bottomNodes, 65, 3);
    const mesh = toothMeshes.get('z1')!;
    const expectedMaxY = Math.max(...mesh.beads.map(b => b.y)) + 26;
    const result = computeSilyankaExtraMaxY(
      [], {}, [], [], bottomNodes, [], 20, [tooth], toothMeshes,
    );
    expect(result).toBe(expectedMaxY);
    expect(result).toBeGreaterThan(100 + 26 - 1);
  });

  it('accounts for a chain anchored on a tooth node', () => {
    const bottomNodes = [makeNode(0, 100), makeNode(1, 100), makeNode(2, 100)];
    const tooth: ToothPlacement = { placementId: 'z1', startCol: 0, endCol: 2, colorMap: {} };
    const toothMeshes = computeToothMeshes([tooth], bottomNodes, 65, 3);
    const tipIndex = toothMeshes.get('z1')!.beads.length - 1;
    const chain: PendantChain = {
      placementId: 'c1',
      start: { kind: 'grid', col: 0 },
      end: { kind: 'tooth', placementId: 'z1', beadIndex: tipIndex },
      colorMap: {},
    };
    const result = computeSilyankaExtraMaxY(
      [], {}, [], [chain], bottomNodes, [], 20, [tooth], toothMeshes,
    );
    expect(result).toBeGreaterThan(100 + 26 - 1);
  });
});
