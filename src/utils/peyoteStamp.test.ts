import { describe, it, expect } from 'vitest';
import {
  translatePeyoteBeadId, capturePeyoteStampPattern, applyPeyoteStampPattern, PeyoteStampContext,
} from './peyoteStamp';

const ctx = (over: Partial<PeyoteStampContext> = {}): PeyoteStampContext => ({
  width: 10,
  height: 10,
  ...over,
});

describe('translatePeyoteBeadId — plain shift', () => {
  it('shifts by dRow/dCol (even dRow, no parity correction)', () => {
    expect(translatePeyoteBeadId('peyote-2-1', 2, 1, 2, ctx())).toBe('peyote-4-2');
  });

  it('a candidate outside the grid → null', () => {
    expect(translatePeyoteBeadId('peyote-2-1', 2, 1, 2, ctx({ width: 2, height: 10 }))).toBeNull();
  });

  it('an unrecognized id → null', () => {
    expect(translatePeyoteBeadId('foobar', 1, 1, 0, ctx())).toBeNull();
  });
});

describe('translatePeyoteBeadId — column correction for odd dRow', () => {
  // Нечётные ряды физически сдвинуты на pitchX/2 (peyoteGenerator.ts). Без
  // коррекции узор, переносимый через ряд другой чётности, рвётся — та же
  // логика, что colParityCorrection в utils/stamp.ts.
  it('anchor on an even row: a bead of the same parity gets no correction', () => {
    // anchorRow=2 (чётный), бисерина r=2 (та же чётность) → без коррекции
    expect(translatePeyoteBeadId('peyote-2-4', 1, 1, 2, ctx())).toBe('peyote-3-5');
  });

  it('anchor on an even row: a bead of the other parity gets +1 to the column', () => {
    // anchorRow=2 (чётный), бисерина r=3 (другая чётность) → +1 к колонке
    expect(translatePeyoteBeadId('peyote-3-4', 1, 1, 2, ctx())).toBe('peyote-4-6');
  });

  it('anchor on an odd row: a bead of the other parity gets -1 to the column', () => {
    // anchorRow=3 (нечётный), бисерина r=2 (другая чётность) → -1 к колонке
    expect(translatePeyoteBeadId('peyote-2-4', 1, 1, 3, ctx())).toBe('peyote-3-4');
  });

  it('even dRow — correction is not applied regardless of parity', () => {
    expect(translatePeyoteBeadId('peyote-2-4', 2, 1, 2, ctx())).toBe('peyote-4-5');
  });
});

describe('capturePeyoteStampPattern', () => {
  it('anchor = minimum (row, col) among selected beads; uncolored ones are dropped', () => {
    const p = capturePeyoteStampPattern(
      ['peyote-1-2', 'peyote-3-1', 'peyote-1-5'],
      { 'peyote-1-2': 'red', 'peyote-3-1': 'blue' }, // peyote-1-5 selected but uncolored
    );
    expect(p.anchorRow).toBe(1);
    expect(p.anchorCol).toBe(2);
    expect(p.entries).toEqual(
      expect.arrayContaining([
        { id: 'peyote-1-2', color: 'red' },
        { id: 'peyote-3-1', color: 'blue' },
      ]),
    );
    expect(p.entries).toHaveLength(2);
  });

  it('an empty selection → anchor (0,0)', () => {
    expect(capturePeyoteStampPattern([], {})).toEqual({ anchorRow: 0, anchorCol: 0, entries: [] });
  });
});

describe('applyPeyoteStampPattern', () => {
  it('transfers colors to targetAnchor, dropping beads with no counterpart in the grid', () => {
    const pattern = {
      anchorRow: 1,
      anchorCol: 2,
      entries: [
        { id: 'peyote-1-2', color: 'red' },
        { id: 'peyote-2-2', color: 'blue' },
      ],
    };
    // dRow=1, dCol=0. anchorRow=1 (нечётный): peyote-1-2 (r=1, та же чётность)
    // → без коррекции → peyote-2-2; peyote-2-2 (r=2, другая чётность) → -1 к
    // колонке → peyote-3-1.
    const patch = applyPeyoteStampPattern(pattern, { row: 2, col: 2 }, ctx());
    expect(patch['peyote-2-2']).toBe('red');
    expect(patch['peyote-3-1']).toBe('blue');
  });

  it('a bead with no target in the grid is excluded from the patch', () => {
    const pattern = {
      anchorRow: 0,
      anchorCol: 0,
      entries: [{ id: 'peyote-0-0', color: 'red' }],
    };
    const patch = applyPeyoteStampPattern(pattern, { row: 0, col: 0 }, ctx({ width: 1, height: 1 }));
    expect(patch).toEqual({ 'peyote-0-0': 'red' });

    const droppedPatch = applyPeyoteStampPattern(pattern, { row: -1, col: 0 }, ctx());
    expect(droppedPatch).toEqual({});
  });
});
