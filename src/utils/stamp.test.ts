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
  it('сдвигает по dRow/dCol', () => {
    const c = ctx({ beadIds: new Set(['node-4-2']) });
    expect(translateBeadId('node-2-1', 2, 1, c)).toBe('node-4-2');
  });

  it('кандидат вне текущей сетки → null', () => {
    const c = ctx({ beadIds: new Set() });
    expect(translateBeadId('node-2-1', 2, 1, c)).toBeNull();
  });
});

describe('translateBeadId — кромки', () => {
  it('top-link переносится по горизонтали при dRow=0', () => {
    const c = ctx({ beadIds: new Set(['span-edge-top-link-3-bead-1']) });
    expect(translateBeadId('span-edge-top-link-1-bead-1', 0, 2, c)).toBe(
      'span-edge-top-link-3-bead-1',
    );
  });

  it('top-link роняется при вертикальном сдвиге (dRow≠0)', () => {
    const c = ctx({ beadIds: new Set(['span-edge-top-link-3-bead-1']) });
    expect(translateBeadId('span-edge-top-link-1-bead-1', 1, 2, c)).toBeNull();
  });

  it('bottom-link переносится при dRow=0 и роняется при dRow≠0', () => {
    const c = ctx({ beadIds: new Set(['span-edge-bottom-link-3-bead-1']) });
    expect(translateBeadId('span-edge-bottom-link-1-bead-1', 0, 2, c)).toBe(
      'span-edge-bottom-link-3-bead-1',
    );
    expect(translateBeadId('span-edge-bottom-link-1-bead-1', -2, 2, c)).toBeNull();
  });
});

describe('translateBeadId — вертикальные грани и округление индекса', () => {
  // Ряд 1 (src): internal 3; ряд 3 (dst): internal 7.
  const rounding = ctx({
    rowSpanOverrides: { 1: 5, 3: 9 },
    beadIds: new Set([
      'span-edge-3-2-left-bead-2',
      'span-edge-3-2-left-bead-4',
      'span-edge-3-2-left-bead-6',
    ]),
  });

  it('индекс масштабируется round(t*(dstCount+1)) при разном числе бусин', () => {
    // i=1 → t=0.25 → round(0.25*8)=2
    expect(translateBeadId('span-edge-1-2-left-bead-1', 2, 0, rounding)).toBe(
      'span-edge-3-2-left-bead-2',
    );
    // i=2 → t=0.5 → round(0.5*8)=4
    expect(translateBeadId('span-edge-1-2-left-bead-2', 2, 0, rounding)).toBe(
      'span-edge-3-2-left-bead-4',
    );
    // i=3 → t=0.75 → round(0.75*8)=6
    expect(translateBeadId('span-edge-1-2-left-bead-3', 2, 0, rounding)).toBe(
      'span-edge-3-2-left-bead-6',
    );
  });

  it('масштабированный индекс за пределами [1,dstCount] → null', () => {
    // из широкого ряда (internal 7) в узкий (internal 3): i=7 → t=0.875 →
    // round(0.875*4)=round(3.5)=4 > dstCount=3 → null
    const c = ctx({
      rowSpanOverrides: { 1: 5, 3: 9 },
      beadIds: new Set(['span-edge-1-2-left-bead-4']),
    });
    expect(translateBeadId('span-edge-3-2-left-bead-7', -2, 0, c)).toBeNull();
  });

  it('ряд-приёмник без внутренних бусин (count=0) → null', () => {
    const c = ctx({ rowSpanOverrides: { 5: 2 } }); // internal(5)=max(0,2-2)=0
    expect(translateBeadId('span-edge-1-2-left-bead-1', 4, 0, c)).toBeNull();
  });
});

describe('translateBeadId — декор', () => {
  it('переносится, если полоса-приёмник имеет ряд k', () => {
    const c = ctx({ decorBands: { 2: 3 }, beadIds: new Set(['decor-2-1-1']) });
    expect(translateBeadId('decor-0-1-1', 2, 0, c)).toBe('decor-2-1-1');
  });

  it('k больше числа рядов полосы-приёмника → null', () => {
    const c = ctx({ decorBands: { 2: 3 }, beadIds: new Set(['decor-2-4-1']) });
    expect(translateBeadId('decor-0-4-1', 2, 0, c)).toBeNull();
  });
});

describe('translateBeadId — pendant не поддерживается', () => {
  it('pendant:* → null', () => {
    expect(translateBeadId('pendant:p1:0', 0, 0, ctx())).toBeNull();
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
  it('anchor = минимальный (row, col) среди NODE; незакрашенные отброшены', () => {
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
    expect(p.entries).toHaveLength(2);
    expect(p.entries).toEqual(
      expect.arrayContaining([
        { id: 'node-1-2', color: 'red' },
        { id: 'node-3-1', color: 'blue' },
      ]),
    );
  });

  it('без NODE в выделении anchor берётся из всех бисерин', () => {
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
    expect(p.entries).toEqual([{ id: span.id, color: 'green' }]);
  });

  it('пустое выделение → anchor (0,0)', () => {
    const p = captureStampPattern([], [], {});
    expect(p).toEqual({ anchorRow: 0, anchorCol: 0, entries: [] });
  });
});

describe('applyStampPattern', () => {
  it('переносит цвета на targetAnchor, отбрасывая бисерины без аналога', () => {
    const pattern = {
      anchorRow: 1,
      anchorCol: 2,
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

  it('бисерина без цели в сетке не попадает в патч', () => {
    const pattern = {
      anchorRow: 1,
      anchorCol: 2,
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
