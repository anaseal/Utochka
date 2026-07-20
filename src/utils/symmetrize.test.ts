import { describe, it, expect } from 'vitest';
import { fillMissingMirror } from './symmetrize';
import { mirrorBeadId } from './mirror';

// Общая сетка для тестов: width=6, internalTop=2.
const W = 6;
const IT = 2;
const mirror = (id: string) => mirrorBeadId(id, W, IT);

describe('fillMissingMirror', () => {
  it('fills the missing mirrored half with the same color', () => {
    const map = { 'node-0-0': '#ff0000' };
    const next = fillMissingMirror(map, mirror);
    expect(next).toEqual({ 'node-0-0': '#ff0000', 'node-0-5': '#ff0000' });
  });

  it('does not overwrite an already-painted mirror pair, even if the color differs', () => {
    const map = { 'node-0-0': '#ff0000', 'node-0-5': '#00ff00' };
    const next = fillMissingMirror(map, mirror);
    expect(next).toEqual(map);
  });

  it('returns the same reference when nothing changes (already symmetric)', () => {
    const map = { 'node-0-0': '#ff0000', 'node-0-5': '#ff0000' };
    expect(fillMissingMirror(map, mirror)).toBe(map);
  });

  it('skips ids without a mirror pair (mirrorFn returns null)', () => {
    const map = { 'node-0-6': '#ff0000' };
    expect(fillMissingMirror(map, mirror)).toBe(map);
  });

  it('skips ids that are their own mirror (center of an odd row)', () => {
    const map = { 'node-1-2': '#ff0000' };
    expect(fillMissingMirror(map, mirror)).toBe(map);
  });
});
