import { describe, it, expect } from 'vitest';
import {
  getChainBeadCount, computeChainBeadPositions, chainBeadId, isChainBeadId, parseChainBeadId,
  resolveChainAnchor, chainEndpointsEqual, chainEndpointsAllowed,
} from './pendantChain';
import { computeToothMesh, toothBeadId } from './tooth';

describe('getChainBeadCount', () => {
  it('farther nodes → more beads', () => {
    const near = getChainBeadCount(50);
    const far = getChainBeadCount(500);
    expect(far).toBeGreaterThan(near);
  });

  it('never returns less than the minimum — short chains still get enough beads for visible volume', () => {
    expect(getChainBeadCount(0)).toBe(4);
    expect(getChainBeadCount(1)).toBe(4);
    expect(getChainBeadCount(30)).toBeGreaterThanOrEqual(4);
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

describe('resolveChainAnchor', () => {
  it('resolves a grid endpoint via bottomNodeByCol', () => {
    const bottomNodeByCol = new Map([[3, { id: 'node-0-3', x: 30, y: 0 }]]);
    const anchor = resolveChainAnchor({ kind: 'grid', col: 3 }, bottomNodeByCol, new Map());
    expect(anchor).toEqual({ id: 'node-0-3', x: 30, y: 0 });
  });

  it('returns null for a grid endpoint whose column has no node', () => {
    expect(resolveChainAnchor({ kind: 'grid', col: 3 }, new Map(), new Map())).toBeNull();
  });

  it('resolves a tooth endpoint via the mesh bead at beadIndex', () => {
    const mesh = computeToothMesh(2, 6, 0, 44, 22, 0);
    const toothMeshes = new Map([['z1', mesh]]);
    const anchor = resolveChainAnchor(
      { kind: 'tooth', placementId: 'z1', beadIndex: 0 }, new Map(), toothMeshes,
    );
    expect(anchor).toEqual({ id: toothBeadId('z1', 0), x: mesh.beads[0].x, y: mesh.beads[0].y });
  });

  it('returns null for a tooth endpoint referencing a missing tooth or bead index', () => {
    expect(resolveChainAnchor(
      { kind: 'tooth', placementId: 'missing', beadIndex: 0 }, new Map(), new Map(),
    )).toBeNull();
  });
});

describe('chainEndpointsEqual', () => {
  it('grid endpoints are equal iff the column matches', () => {
    expect(chainEndpointsEqual({ kind: 'grid', col: 3 }, { kind: 'grid', col: 3 })).toBe(true);
    expect(chainEndpointsEqual({ kind: 'grid', col: 3 }, { kind: 'grid', col: 4 })).toBe(false);
  });

  it('tooth endpoints are equal iff placementId and beadIndex both match', () => {
    expect(chainEndpointsEqual(
      { kind: 'tooth', placementId: 'z1', beadIndex: 2 },
      { kind: 'tooth', placementId: 'z1', beadIndex: 2 },
    )).toBe(true);
    expect(chainEndpointsEqual(
      { kind: 'tooth', placementId: 'z1', beadIndex: 2 },
      { kind: 'tooth', placementId: 'z2', beadIndex: 2 },
    )).toBe(false);
  });

  it('a grid endpoint never equals a tooth endpoint', () => {
    expect(chainEndpointsEqual(
      { kind: 'grid', col: 0 }, { kind: 'tooth', placementId: 'z1', beadIndex: 0 },
    )).toBe(false);
  });
});

describe('chainEndpointsAllowed', () => {
  // width 4 (startCol=2, endCol=6) → rows=4; row1 (y=22) has 4 nodes, i=0/3
  // on the boundary (side), i=1/2 interior (no side).
  const mesh = computeToothMesh(2, 6, 0, 44, 22, 0);
  const toothMeshes = new Map([['z1', mesh]]);
  const row1 = mesh.beads
    .map((b, i) => ({ ...b, i }))
    .filter(b => b.kind === 'node' && b.y === 22)
    .sort((a, b) => a.x - b.x);
  const leftIndex = row1[0].i;
  const interiorIndex = row1[1].i;
  const rightIndex = row1[row1.length - 1].i;
  const tipIndex = mesh.beads.length - 1;

  it('allows two grid nodes (no tooth involved)', () => {
    expect(chainEndpointsAllowed({ kind: 'grid', col: 0 }, { kind: 'grid', col: 5 }, toothMeshes))
      .toBe(true);
  });

  it('is unrestricted between a grid node and a tooth node', () => {
    expect(chainEndpointsAllowed(
      { kind: 'grid', col: 0 }, { kind: 'tooth', placementId: 'z1', beadIndex: leftIndex }, toothMeshes,
    )).toBe(true);
  });

  it('is unrestricted between two different teeth', () => {
    expect(chainEndpointsAllowed(
      { kind: 'tooth', placementId: 'z1', beadIndex: leftIndex },
      { kind: 'tooth', placementId: 'z2', beadIndex: leftIndex },
      toothMeshes,
    )).toBe(true);
  });

  it('rejects two nodes on opposite sides of the same tooth', () => {
    expect(chainEndpointsAllowed(
      { kind: 'tooth', placementId: 'z1', beadIndex: leftIndex },
      { kind: 'tooth', placementId: 'z1', beadIndex: rightIndex },
      toothMeshes,
    )).toBe(false);
  });

  it('the tip counts as both sides — allowed against either side of the same tooth', () => {
    expect(chainEndpointsAllowed(
      { kind: 'tooth', placementId: 'z1', beadIndex: leftIndex },
      { kind: 'tooth', placementId: 'z1', beadIndex: tipIndex },
      toothMeshes,
    )).toBe(true);
    expect(chainEndpointsAllowed(
      { kind: 'tooth', placementId: 'z1', beadIndex: rightIndex },
      { kind: 'tooth', placementId: 'z1', beadIndex: tipIndex },
      toothMeshes,
    )).toBe(true);
  });

  it('rejects a same-tooth pair when one endpoint is an interior (non-edge) node', () => {
    expect(chainEndpointsAllowed(
      { kind: 'tooth', placementId: 'z1', beadIndex: interiorIndex },
      { kind: 'tooth', placementId: 'z1', beadIndex: leftIndex },
      toothMeshes,
    )).toBe(false);
  });
});
