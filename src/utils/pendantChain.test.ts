import { describe, it, expect } from 'vitest';
import {
  getChainBeadCount, computeChainBeadPositions, chainBeadId, isChainBeadId, parseChainBeadId,
} from './pendantChain';

describe('getChainBeadCount', () => {
  it('farther nodes → more beads', () => {
    const near = getChainBeadCount(50);
    const far = getChainBeadCount(500);
    expect(far).toBeGreaterThan(near);
  });

  it('never returns less than 1', () => {
    expect(getChainBeadCount(0)).toBe(1);
    expect(getChainBeadCount(1)).toBe(1);
  });
});

describe('computeChainBeadPositions', () => {
  it('returns one position per bead, count matching getChainBeadCount', () => {
    const start = { x: 0, y: 100 };
    const end = { x: 300, y: 100 };
    const positions = computeChainBeadPositions(start, end);
    expect(positions.length).toBe(getChainBeadCount(300));
  });

  it('sags downward (+y) from the chord between same-row nodes', () => {
    const start = { x: 0, y: 100 };
    const end = { x: 300, y: 100 };
    const positions = computeChainBeadPositions(start, end);
    const chordY = 100;
    for (const p of positions) expect(p.y).toBeGreaterThan(chordY);
  });

  it('middle bead sags deeper than beads near the endpoints', () => {
    const start = { x: 0, y: 100 };
    const end = { x: 400, y: 100 };
    const positions = computeChainBeadPositions(start, end);
    const mid = positions[Math.floor(positions.length / 2)];
    const nearStart = positions[0];
    expect(mid.y).toBeGreaterThan(nearStart.y);
  });

  it('x positions are monotonically increasing between start and end', () => {
    const start = { x: 0, y: 100 };
    const end = { x: 400, y: 100 };
    const positions = computeChainBeadPositions(start, end);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].x).toBeGreaterThan(positions[i - 1].x);
    }
  });

  it('relative sag (max dip / distance) shrinks for longer chains — a short chain '
    + 'between a few nodes can dip deep relative to its own length, a long chain '
    + 'between many nodes may not', () => {
    const shortEnd = { x: 60, y: 100 };
    const longEnd = { x: 1200, y: 100 };
    const shortPositions = computeChainBeadPositions({ x: 0, y: 100 }, shortEnd);
    const longPositions = computeChainBeadPositions({ x: 0, y: 100 }, longEnd);
    const shortRatio = Math.max(...shortPositions.map(p => p.y - 100)) / 60;
    const longRatio = Math.max(...longPositions.map(p => p.y - 100)) / 1200;
    expect(longRatio).toBeLessThan(shortRatio);
  });
});

describe('chain bead id round-trip', () => {
  it('encodes and decodes placementId/index', () => {
    const id = chainBeadId('abc-123', 4);
    expect(isChainBeadId(id)).toBe(true);
    expect(parseChainBeadId(id)).toEqual(['abc-123', 4]);
  });

  it('grid/pendant ids are not recognized as chain ids', () => {
    expect(isChainBeadId('node-0-3')).toBe(false);
    expect(isChainBeadId('pendant:abc:0')).toBe(false);
  });
});
