import { describe, it, expect } from 'vitest';
import { computeSilyankaExtraMaxY } from './pendantCanvasDim';
import { PENDANT_SCALE } from '../data/pendantTemplates';
import { Bead } from '../types/bead';
import { PendantTemplate, PendantPlacement, PendantChain, DecorTailPlacement } from '../types/pendant';

const makeNode = (col: number, y = 0): Bead => ({
  id: `node:0:${col}`, x: col * 65, y, type: 'NODE', logicalIndex: { row: 0, col },
});

describe('computeSilyankaExtraMaxY', () => {
  it('returns 0 when nothing is placed', () => {
    expect(computeSilyankaExtraMaxY([], {}, [], [], [], [], 20)).toBe(0);
  });

  it('accounts for a pendant depth below its anchor', () => {
    const template: PendantTemplate = {
      id: 't1', name: 'T1', links: [],
      beads: [{ dx: 0, dy: 10, shape: 'circle', type: 'NODE', r: 4 }],
    };
    const placement: PendantPlacement = { placementId: 'p1', templateId: 't1', col: 0, colorMap: {} };
    const anchor = makeNode(0, 100);
    const result = computeSilyankaExtraMaxY(
      [placement], { t1: template }, [anchor], [], [], [], 20,
    );
    expect(result).toBeCloseTo(anchor.y + 14 * PENDANT_SCALE + 26);
  });

  it('ignores a placement with no matching template or anchor', () => {
    const placement: PendantPlacement = { placementId: 'p1', templateId: 'missing', col: 0, colorMap: {} };
    expect(computeSilyankaExtraMaxY([placement], {}, [makeNode(0, 100)], [], [], [], 20)).toBe(0);
  });

  it('accounts for chain sag between two bottom nodes', () => {
    const start = makeNode(0, 100);
    const end = makeNode(5, 100);
    const chain: PendantChain = { placementId: 'c1', startCol: 0, endCol: 5, colorMap: {} };
    const result = computeSilyankaExtraMaxY([], {}, [], [chain], [start, end], [], 20);
    expect(result).toBeGreaterThan(100 + 26 - 1);
  });

  it('accounts for a decor tail hanging straight down', () => {
    const anchor = makeNode(0, 100);
    const tail: DecorTailPlacement = { placementId: 'd1', col: 0, rows: 3, colorMap: {} };
    const result = computeSilyankaExtraMaxY([], {}, [], [], [anchor], [tail], 20);
    expect(result).toBe(100 + 3 * 20 + 26);
  });

  it('takes the max across all three layers', () => {
    const anchor = makeNode(0, 100);
    const tail: DecorTailPlacement = { placementId: 'd1', col: 0, rows: 1, colorMap: {} };
    const tallTail: DecorTailPlacement = { placementId: 'd2', col: 1, rows: 10, colorMap: {} };
    const result = computeSilyankaExtraMaxY(
      [], {}, [], [], [anchor, makeNode(1, 100)], [tail, tallTail], 20,
    );
    expect(result).toBe(100 + 10 * 20 + 26);
  });
});
