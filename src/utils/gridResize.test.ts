import { describe, it, expect } from 'vitest';
import { resizeWidthRelative, resizeWidthAbsolute } from './gridResize';

describe('resizeWidthRelative — normal mode', () => {
  it('applies delta directly', () => {
    expect(resizeWidthRelative(10, 3, false, 100)).toEqual({ newWidth: 13, mirrorDelta: 0 });
  });

  it('clamps at maxWidth', () => {
    expect(resizeWidthRelative(99, 5, false, 100)).toEqual({ newWidth: 100, mirrorDelta: 0 });
  });

  it('clamps at 1', () => {
    expect(resizeWidthRelative(2, -5, false, 100)).toEqual({ newWidth: 1, mirrorDelta: 0 });
  });

  it('returns null when already at the clamp (no-op)', () => {
    expect(resizeWidthRelative(1, -1, false, 100)).toBeNull();
  });
});

describe('resizeWidthRelative — Mirror Mode', () => {
  it('doubles the delta (symmetric pair of columns) and reports mirrorDelta = delta', () => {
    expect(resizeWidthRelative(10, 2, true, 100)).toEqual({ newWidth: 14, mirrorDelta: 2 });
  });

  it('handles negative delta (shrinking)', () => {
    expect(resizeWidthRelative(10, -3, true, 100)).toEqual({ newWidth: 4, mirrorDelta: -3 });
  });

  it('returns null when the doubled delta would exceed maxWidth', () => {
    expect(resizeWidthRelative(98, 5, true, 100)).toBeNull();
  });

  it('returns null when the doubled delta would go below 1', () => {
    expect(resizeWidthRelative(2, -3, true, 100)).toBeNull();
  });

  it('returns null on a zero delta (no-op)', () => {
    expect(resizeWidthRelative(10, 0, true, 100)).toBeNull();
  });
});

describe('resizeWidthAbsolute — normal mode', () => {
  it('rounds the target', () => {
    expect(resizeWidthAbsolute(10, 15.4, false, 100)).toEqual({ newWidth: 15, mirrorDelta: 0 });
  });

  it('clamps at maxWidth', () => {
    expect(resizeWidthAbsolute(10, 500, false, 100)).toEqual({ newWidth: 100, mirrorDelta: 0 });
  });

  it('returns null when the rounded target equals the current width', () => {
    expect(resizeWidthAbsolute(10, 10, false, 100)).toBeNull();
  });
});

describe('resizeWidthAbsolute — Mirror Mode', () => {
  it('an even width difference keeps the target and splits it evenly per side', () => {
    expect(resizeWidthAbsolute(10, 14, true, 100)).toEqual({ newWidth: 14, mirrorDelta: 2 });
  });

  it('an odd width difference rounds up by one column to stay symmetric', () => {
    expect(resizeWidthAbsolute(10, 15, true, 100)).toEqual({ newWidth: 16, mirrorDelta: 3 });
  });

  it('rounds down instead when rounding up would exceed maxWidth', () => {
    // target clamps to maxWidth=100, diff=91 (odd); +1 would exceed maxWidth → round down to 99
    expect(resizeWidthAbsolute(9, 100, true, 100)).toEqual({ newWidth: 99, mirrorDelta: 45 });
  });

  it('returns null on a no-op target', () => {
    expect(resizeWidthAbsolute(10, 10, true, 100)).toBeNull();
  });
});
