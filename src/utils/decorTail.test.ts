import { describe, it, expect } from 'vitest';
import {
  decorTailBeadId,
  isDecorTailBeadId,
  parseDecorTailBeadId,
  computeDecorTailBeadPositions,
} from './decorTail';

describe('decorTailBeadId — id round-trip', () => {
  it('encodes and parses back placementId and index', () => {
    const id = decorTailBeadId('d1', 2);
    expect(isDecorTailBeadId(id)).toBe(true);
    expect(parseDecorTailBeadId(id)).toEqual(['d1', 2]);
  });

  it('does not match ids from other namespaces', () => {
    expect(isDecorTailBeadId('node-0-0')).toBe(false);
    expect(isDecorTailBeadId('pendant:p1:0')).toBe(false);
    expect(isDecorTailBeadId('decor-0-1-0')).toBe(false);
  });
});

describe('computeDecorTailBeadPositions', () => {
  it('places `rows` beads in a straight column under the anchor, spaced by decorRowStep', () => {
    const positions = computeDecorTailBeadPositions({ x: 10, y: 100 }, 3, 14);
    expect(positions).toEqual([
      { x: 10, y: 114 },
      { x: 10, y: 128 },
      { x: 10, y: 142 },
    ]);
  });

  it('returns an empty array for zero rows', () => {
    expect(computeDecorTailBeadPositions({ x: 0, y: 0 }, 0, 14)).toEqual([]);
  });
});
