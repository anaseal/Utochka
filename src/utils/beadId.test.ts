import { describe, it, expect } from 'vitest';
import { encode, decode, BeadRef } from './beadId';

describe('beadId — encode/decode round-trip', () => {
  const cases: [string, BeadRef][] = [
    ['node', { kind: 'node', r: 0, c: 0 }],
    ['node with negative column (Edge Extension)', { kind: 'node', r: 3, c: -1 }],
    ['vertEdge left', { kind: 'vertEdge', r: 2, c: 1, side: 'left', i: 1 }],
    ['vertEdge right, negative column', { kind: 'vertEdge', r: 2, c: -1, side: 'right', i: 3 }],
    ['topLink', { kind: 'topLink', c: 4, i: 2 }],
    ['bottomLink', { kind: 'bottomLink', c: 0, i: 1 }],
    ['decor', { kind: 'decor', r: 2, k: 1, c: -1 }],
  ];

  cases.forEach(([label, ref]) => {
    it(`round-trips ${label}`, () => {
      expect(decode(encode(ref))).toEqual(ref);
    });
  });
});

describe('beadId.decode — invalid input', () => {
  it('returns null for an id that matches no known pattern', () => {
    expect(decode('foobar')).toBeNull();
    expect(decode('')).toBeNull();
  });

  it('returns null for ids from a different namespace (pendant/chain/decorTail/tooth)', () => {
    expect(decode('pendant:p1:0')).toBeNull();
    expect(decode('chain:c1:0')).toBeNull();
    expect(decode('decorTail:d1:0')).toBeNull();
    expect(decode('tooth:z1:0')).toBeNull();
  });
});
