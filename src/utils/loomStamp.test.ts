import { describe, it, expect } from 'vitest';
import {
  translateLoomBeadId, captureLoomStampPattern, applyLoomStampPattern, LoomStampContext,
} from './loomStamp';

const ctx = (over: Partial<LoomStampContext> = {}): LoomStampContext => ({
  width: 10,
  height: 10,
  ...over,
});

describe('translateLoomBeadId — plain shift, no parity correction ever', () => {
  it('shifts by dRow/dCol', () => {
    expect(translateLoomBeadId('loom-2-1', 2, 1, ctx())).toBe('loom-4-2');
  });

  it('shifts by an odd dRow — still no column correction (unlike Peyote)', () => {
    expect(translateLoomBeadId('loom-2-4', 1, 1, ctx())).toBe('loom-3-5');
    expect(translateLoomBeadId('loom-3-4', 1, 1, ctx())).toBe('loom-4-5');
  });

  it('a candidate outside the grid → null', () => {
    expect(translateLoomBeadId('loom-2-1', 2, 1, ctx({ width: 2, height: 10 }))).toBeNull();
  });

  it('an unrecognized id → null', () => {
    expect(translateLoomBeadId('foobar', 1, 1, ctx())).toBeNull();
  });
});

describe('captureLoomStampPattern', () => {
  it('anchor = minimum (row, col) among selected beads; uncolored ones are dropped', () => {
    const p = captureLoomStampPattern(
      ['loom-1-2', 'loom-3-1', 'loom-1-5'],
      { 'loom-1-2': 'red', 'loom-3-1': 'blue' }, // loom-1-5 selected but uncolored
    );
    expect(p.anchorRow).toBe(1);
    expect(p.anchorCol).toBe(2);
    expect(p.entries).toEqual(
      expect.arrayContaining([
        { id: 'loom-1-2', color: 'red' },
        { id: 'loom-3-1', color: 'blue' },
      ]),
    );
    expect(p.entries).toHaveLength(2);
  });

  it('an empty selection → anchor (0,0)', () => {
    expect(captureLoomStampPattern([], {})).toEqual({ anchorRow: 0, anchorCol: 0, entries: [] });
  });
});

describe('applyLoomStampPattern', () => {
  it('transfers colors to targetAnchor, dropping beads with no counterpart in the grid', () => {
    const pattern = {
      anchorRow: 1,
      anchorCol: 2,
      entries: [
        { id: 'loom-1-2', color: 'red' },
        { id: 'loom-2-2', color: 'blue' },
      ],
    };
    // dRow=1, dCol=0 — plain shift, no parity correction.
    const patch = applyLoomStampPattern(pattern, { row: 2, col: 2 }, ctx());
    expect(patch['loom-2-2']).toBe('red');
    expect(patch['loom-3-2']).toBe('blue');
  });

  it('a bead with no target in the grid is excluded from the patch', () => {
    const pattern = {
      anchorRow: 0,
      anchorCol: 0,
      entries: [{ id: 'loom-0-0', color: 'red' }],
    };
    const patch = applyLoomStampPattern(pattern, { row: 0, col: 0 }, ctx({ width: 1, height: 1 }));
    expect(patch).toEqual({ 'loom-0-0': 'red' });

    const droppedPatch = applyLoomStampPattern(pattern, { row: -1, col: 0 }, ctx());
    expect(droppedPatch).toEqual({});
  });
});
