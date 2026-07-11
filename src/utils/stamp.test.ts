import { describe, it, expect } from 'vitest';
import {
  translateBeadId,
  captureStampPattern,
  applyStampPattern,
  StampContext,
} from './stamp';
import { Bead } from '../types/bead';

// Базовый контекст: topSpan=bottomSpan=5 → internal=3 во всех рядах, если нет
// override. beadIds задаётся точечно в каждом тесте, чтобы изолировать формулу.
const ctx = (over: Partial<StampContext> = {}): StampContext => ({
  topSpan: 5,
  bottomSpan: 5,
  rowSpanOverrides: {},
  decorBands: {},
  beadIds: new Set<string>(),
  ...over,
});

describe('translateBeadId — NODE', () => {
  it('shifts by dRow/dCol', () => {
    const c = ctx({ beadIds: new Set(['node-4-2']) });
    expect(translateBeadId('node-2-1', 2, 1, c, 2)).toBe('node-4-2');
  });

  it('a candidate outside the current grid → null', () => {
    const c = ctx({ beadIds: new Set() });
    expect(translateBeadId('node-2-1', 2, 1, c, 2)).toBeNull();
  });
});

describe('translateBeadId — NODE, column correction for odd dRow', () => {
  // Нечётные ряды физически сдвинуты на полшага (generator.ts:61-62). Без
  // коррекции узор, переносимый через ряд другой чётности, рвётся: бисерины
  // «не той» чётности относительно anchorRow съезжают на целую колонку.
  it('anchor on an even row: a bead of the same parity gets no correction', () => {
    const c = ctx({ beadIds: new Set(['node-3-5']) });
    // anchorRow=2 (чётный), бисерина r=2 (та же чётность) → без коррекции
    expect(translateBeadId('node-2-4', 1, 1, c, 2)).toBe('node-3-5');
  });

  it('anchor on an even row: a bead of the other parity gets +1 to the column', () => {
    const c = ctx({ beadIds: new Set(['node-4-6']) });
    // anchorRow=2 (чётный), бисерина r=3 (другая чётность) → +1 к колонке
    expect(translateBeadId('node-3-4', 1, 1, c, 2)).toBe('node-4-6');
  });

  it('anchor on an odd row: a bead of the other parity gets -1 to the column', () => {
    const c = ctx({ beadIds: new Set(['node-3-4']) });
    // anchorRow=3 (нечётный), бисерина r=2 (другая чётность) → -1 к колонке
    expect(translateBeadId('node-2-4', 1, 1, c, 3)).toBe('node-3-4');
  });

  it('even dRow — correction is not applied regardless of parity', () => {
    const c = ctx({ beadIds: new Set(['node-4-5']) });
    expect(translateBeadId('node-2-4', 2, 1, c, 2)).toBe('node-4-5');
  });
});

describe('translateBeadId — edges', () => {
  it('top-link moves horizontally when dRow=0', () => {
    const c = ctx({ beadIds: new Set(['span-edge-top-link-3-bead-1']) });
    expect(translateBeadId('span-edge-top-link-1-bead-1', 0, 2, c, 0)).toBe(
      'span-edge-top-link-3-bead-1',
    );
  });

  it('top-link is dropped on a vertical shift (dRow≠0)', () => {
    const c = ctx({ beadIds: new Set(['span-edge-top-link-3-bead-1']) });
    expect(translateBeadId('span-edge-top-link-1-bead-1', 1, 2, c, 0)).toBeNull();
  });

  it('bottom-link moves when dRow=0 and is dropped when dRow≠0', () => {
    const c = ctx({ beadIds: new Set(['span-edge-bottom-link-3-bead-1']) });
    expect(translateBeadId('span-edge-bottom-link-1-bead-1', 0, 2, c, 0)).toBe(
      'span-edge-bottom-link-3-bead-1',
    );
    expect(translateBeadId('span-edge-bottom-link-1-bead-1', -2, 2, c, 0)).toBeNull();
  });
});

describe('translateBeadId — vertical edges and index rounding', () => {
  // Ряд 1 (src): internal 3; ряд 3 (dst): internal 7.
  const rounding = ctx({
    rowSpanOverrides: { 1: 5, 3: 9 },
    beadIds: new Set([
      'span-edge-3-2-left-bead-2',
      'span-edge-3-2-left-bead-4',
      'span-edge-3-2-left-bead-6',
    ]),
  });

  it('the index is scaled as round(t*(dstCount+1)) when bead counts differ', () => {
    // i=1 → t=0.25 → round(0.25*8)=2
    expect(translateBeadId('span-edge-1-2-left-bead-1', 2, 0, rounding, 1)).toBe(
      'span-edge-3-2-left-bead-2',
    );
    // i=2 → t=0.5 → round(0.5*8)=4
    expect(translateBeadId('span-edge-1-2-left-bead-2', 2, 0, rounding, 1)).toBe(
      'span-edge-3-2-left-bead-4',
    );
    // i=3 → t=0.75 → round(0.75*8)=6
    expect(translateBeadId('span-edge-1-2-left-bead-3', 2, 0, rounding, 1)).toBe(
      'span-edge-3-2-left-bead-6',
    );
  });

  it('a scaled index outside [1,dstCount] → null', () => {
    // из широкого ряда (internal 7) в узкий (internal 3): i=7 → t=0.875 →
    // round(0.875*4)=round(3.5)=4 > dstCount=3 → null
    const c = ctx({
      rowSpanOverrides: { 1: 5, 3: 9 },
      beadIds: new Set(['span-edge-1-2-left-bead-4']),
    });
    expect(translateBeadId('span-edge-3-2-left-bead-7', -2, 0, c, 3)).toBeNull();
  });

  it('a destination row with no internal beads (count=0) → null', () => {
    const c = ctx({ rowSpanOverrides: { 5: 2 } }); // internal(5)=max(0,2-2)=0
    expect(translateBeadId('span-edge-1-2-left-bead-1', 4, 0, c, 1)).toBeNull();
  });
});

describe('translateBeadId — decor', () => {
  it('is transferred if the destination band has row k', () => {
    const c = ctx({ decorBands: { 2: 3 }, beadIds: new Set(['decor-2-1-1']) });
    expect(translateBeadId('decor-0-1-1', 2, 0, c, 0)).toBe('decor-2-1-1');
  });

  it('k greater than the destination band row count → null', () => {
    const c = ctx({ decorBands: { 2: 3 }, beadIds: new Set(['decor-2-4-1']) });
    expect(translateBeadId('decor-0-4-1', 2, 0, c, 0)).toBeNull();
  });
});

describe('translateBeadId — pendant is not supported', () => {
  it('pendant:* → null', () => {
    expect(translateBeadId('pendant:p1:0', 0, 0, ctx(), 0)).toBeNull();
  });
});

// --- capture / apply ---

const node = (id: string, row: number, col: number): Bead => ({
  id,
  x: 0,
  y: 0,
  type: 'NODE',
  logicalIndex: { row, col },
});

describe('captureStampPattern', () => {
  it('anchor = minimum (row, col) among NODE beads; uncolored ones are dropped', () => {
    const beads = [
      node('node-1-2', 1, 2),
      node('node-3-1', 3, 1),
      node('node-1-5', 1, 5), // выделен, но без цвета
    ];
    const designMap = { 'node-1-2': 'red', 'node-3-1': 'blue' };
    const p = captureStampPattern(
      beads.map(b => b.id),
      beads,
      designMap,
    );
    expect(p.anchorRow).toBe(1);
    expect(p.anchorCol).toBe(2);
    expect(p.anchorRowBottom).toBe(3);
    expect(p.anchorColBottom).toBe(1);
    expect(p.entries).toHaveLength(2);
    expect(p.entries).toEqual(
      expect.arrayContaining([
        { id: 'node-1-2', color: 'red' },
        { id: 'node-3-1', color: 'blue' },
      ]),
    );
  });

  it('without a NODE in the selection, the anchor is taken from all beads', () => {
    const span: Bead = {
      id: 'span-edge-2-0-left-bead-1',
      x: 0,
      y: 0,
      type: 'SPAN',
      logicalIndex: { row: 2, col: 0 },
    };
    const p = captureStampPattern([span.id], [span], { [span.id]: 'green' });
    expect(p.anchorRow).toBe(2);
    expect(p.anchorCol).toBe(0);
    expect(p.anchorRowBottom).toBe(2);
    expect(p.anchorColBottom).toBe(0);
    expect(p.entries).toEqual([{ id: span.id, color: 'green' }]);
  });

  it('an empty selection → anchor (0,0)', () => {
    const p = captureStampPattern([], [], {});
    expect(p).toEqual({
      anchorRow: 0, anchorCol: 0, anchorRowBottom: 0, anchorColBottom: 0, entries: [],
    });
  });
});

describe('applyStampPattern', () => {
  it('transfers colors to targetAnchor, dropping beads with no counterpart', () => {
    const pattern = {
      anchorRow: 1,
      anchorCol: 2,
      anchorRowBottom: 3,
      anchorColBottom: 1,
      entries: [
        { id: 'node-1-2', color: 'red' },
        { id: 'node-3-1', color: 'blue' },
      ],
    };
    // dRow=1, dCol=0 → node-1-2→node-2-2, node-3-1→node-4-1
    const c = ctx({ beadIds: new Set(['node-2-2', 'node-4-1']) });
    const patch = applyStampPattern(pattern, { row: 2, col: 2 }, c);
    expect(patch).toEqual({ 'node-2-2': 'red', 'node-4-1': 'blue' });
  });

  it('a bead with no target in the grid is excluded from the patch', () => {
    const pattern = {
      anchorRow: 1,
      anchorCol: 2,
      anchorRowBottom: 3,
      anchorColBottom: 1,
      entries: [
        { id: 'node-1-2', color: 'red' },
        { id: 'node-3-1', color: 'blue' },
      ],
    };
    const c = ctx({ beadIds: new Set(['node-2-2']) }); // node-4-1 нет
    const patch = applyStampPattern(pattern, { row: 2, col: 2 }, c);
    expect(patch).toEqual({ 'node-2-2': 'red' });
  });
});

describe('applyStampPattern — edge anchoring (top/bottom)', () => {
  // Мотив на 2 ряда: node-0-1 (верх, red) и node-1-1 (низ, blue).
  const pattern = {
    anchorRow: 0,
    anchorCol: 1,
    anchorRowBottom: 1,
    anchorColBottom: 1,
    entries: [
      { id: 'node-0-1', color: 'red' },
      { id: 'node-1-1', color: 'blue' },
    ],
  };

  it('edge="top" (default): targetAnchor aligns with the motif\'s top row', () => {
    const c = ctx({ beadIds: new Set(['node-0-1', 'node-1-1']) });
    const patch = applyStampPattern(pattern, { row: 0, col: 1 }, c);
    expect(patch).toEqual({ 'node-0-1': 'red', 'node-1-1': 'blue' });
  });

  it('edge="bottom": targetAnchor aligns with the motif\'s bottom row — the top row that moves above the grid is dropped', () => {
    // Ставим низ штампа (row=1 мотива) в row=0 полотна: dRow = 0 - 1 = -1.
    // Верхний ряд мотива (row=0) уезжает на row=-1 — такого узла нет.
    const c = ctx({ beadIds: new Set(['node-0-1']) });
    const patch = applyStampPattern(pattern, { row: 0, col: 1 }, c, 'bottom');
    expect(patch).toEqual({ 'node-0-1': 'blue' });
  });
});
