import { describe, it, expect } from 'vitest';
import { mirrorBeadId } from './mirror';

// Общая сетка для тестов: width=6, internalTop=2, internalBottom=2.
const W = 6;
const IT = 2;
const IB = 2;

describe('mirrorBeadId — NODE', () => {
  it('even row: c ↔ width-1-c', () => {
    expect(mirrorBeadId('node-0-0', W, IT)).toBe('node-0-5');
    expect(mirrorBeadId('node-0-5', W, IT)).toBe('node-0-0');
    expect(mirrorBeadId('node-0-2', W, IT)).toBe('node-0-3');
  });

  it('odd row: c ↔ width-2-c (edge nodes have a pair)', () => {
    // нечётный ряд шире не бывает: cols 0..width-2, все зеркалятся внутри сетки
    expect(mirrorBeadId('node-1-0', W, IT)).toBe('node-1-4');
    expect(mirrorBeadId('node-1-4', W, IT)).toBe('node-1-0');
  });

  it('the center node of an odd row is its own pair', () => {
    expect(mirrorBeadId('node-1-2', W, IT)).toBe('node-1-2');
  });

  it('a node outside the grid → null', () => {
    // чётный ряд: c=6 → mc=-1
    expect(mirrorBeadId('node-0-6', W, IT)).toBeNull();
    // нечётный ряд: c=5 → mc=-1
    expect(mirrorBeadId('node-1-5', W, IT)).toBeNull();
  });
});

describe('mirrorBeadId — top/bottom edge', () => {
  it('top-link: column width-2-c, index internalTop+1-i', () => {
    expect(mirrorBeadId('span-edge-top-link-0-bead-1', W, IT)).toBe(
      'span-edge-top-link-4-bead-2',
    );
    expect(mirrorBeadId('span-edge-top-link-4-bead-2', W, IT)).toBe(
      'span-edge-top-link-0-bead-1',
    );
  });

  it('bottom-link is mirrored when internalBottom is set', () => {
    expect(mirrorBeadId('span-edge-bottom-link-1-bead-1', W, IT, IB)).toBe(
      'span-edge-bottom-link-3-bead-2',
    );
  });

  it('bottom-link without internalBottom → null', () => {
    expect(mirrorBeadId('span-edge-bottom-link-1-bead-1', W, IT)).toBeNull();
  });
});

describe('mirrorBeadId — vertical edges (vert-edge)', () => {
  it('even row: column width-1-c, side left↔right', () => {
    expect(mirrorBeadId('span-edge-2-1-left-bead-1', W, IT)).toBe(
      'span-edge-2-4-right-bead-1',
    );
    expect(mirrorBeadId('span-edge-2-4-right-bead-1', W, IT)).toBe(
      'span-edge-2-1-left-bead-1',
    );
  });

  it('odd row: column width-2-c, side flips', () => {
    expect(mirrorBeadId('span-edge-1-0-right-bead-1', W, IT)).toBe(
      'span-edge-1-4-left-bead-1',
    );
  });

  it('even row: the mirrored left edge in column 0 is absent → null', () => {
    // c=5 (край) → mc=0, side right → ms=left; isEven && left && mc===0
    expect(mirrorBeadId('span-edge-2-5-right-bead-1', W, IT)).toBeNull();
  });
});

describe('mirrorBeadId — decor', () => {
  it('decor follows the same logic as the node row (even/odd)', () => {
    expect(mirrorBeadId('decor-2-1-1', W, IT)).toBe('decor-2-1-4');
    expect(mirrorBeadId('decor-1-1-0', W, IT)).toBe('decor-1-1-4');
  });

  it('the strip index k is preserved', () => {
    expect(mirrorBeadId('decor-2-3-1', W, IT)).toBe('decor-2-3-4');
  });
});

describe('mirrorBeadId — unknown ids', () => {
  it('a garbage id → null', () => {
    expect(mirrorBeadId('foobar', W, IT)).toBeNull();
  });

  it('pendant:* is not supported → null', () => {
    expect(mirrorBeadId('pendant:p1:0', W, IT)).toBeNull();
  });
});
