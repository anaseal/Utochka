import { describe, it, expect } from 'vitest';
import { resolvePendantAnchor, pendantAnchorsEqual, mirrorPendantAnchor } from './pendantAnchor';
import { computeToothMesh } from './tooth';
import { Bead } from '../types/bead';
import { ToothPlacement } from '../types/pendant';

const makeNode = (col: number, x: number, y = 100): Bead => ({
  id: `node:2:${col}`, x, y, type: 'NODE', logicalIndex: { row: 2, col },
});

describe('resolvePendantAnchor', () => {
  it('resolves a grid anchor to the matching node in pendantAnchorByCol', () => {
    const node = makeNode(1, 65);
    const byCol = new Map([[1, node]]);
    const result = resolvePendantAnchor({ kind: 'grid', col: 1 }, byCol, new Map());
    expect(result).toEqual({ id: node.id, x: node.x, y: node.y });
  });

  it('returns null for a grid anchor with no matching column', () => {
    expect(resolvePendantAnchor({ kind: 'grid', col: 1 }, new Map(), new Map())).toBeNull();
  });

  it('resolves a tooth anchor to the mesh bead at beadIndex, tip or not', () => {
    const mesh = computeToothMesh(0, 2, 100, 65, 22, 0);
    const toothMeshes = new Map([['z1', mesh]]);
    const tipResult = resolvePendantAnchor(
      { kind: 'tooth', placementId: 'z1', beadIndex: mesh.tipIndex }, new Map(), toothMeshes,
    );
    const tip = mesh.beads[mesh.tipIndex];
    expect(tipResult).toEqual({ id: expect.stringContaining('z1'), x: tip.x, y: tip.y });

    // Не только кончик — любой узел-граница меша (bead.side непустой).
    const sideIndex = mesh.beads.findIndex((b, i) => i !== mesh.tipIndex && (b.side?.length ?? 0) > 0);
    const sideBead = mesh.beads[sideIndex];
    const sideResult = resolvePendantAnchor(
      { kind: 'tooth', placementId: 'z1', beadIndex: sideIndex }, new Map(), toothMeshes,
    );
    expect(sideResult).toEqual({ id: expect.stringContaining('z1'), x: sideBead.x, y: sideBead.y });
  });

  it('returns null for a tooth anchor with no matching mesh (orphaned tooth)', () => {
    expect(resolvePendantAnchor({ kind: 'tooth', placementId: 'gone', beadIndex: 0 }, new Map(), new Map()))
      .toBeNull();
  });

  it('returns null for a beadIndex outside the mesh bounds', () => {
    const mesh = computeToothMesh(0, 2, 100, 65, 22, 0);
    const toothMeshes = new Map([['z1', mesh]]);
    expect(resolvePendantAnchor(
      { kind: 'tooth', placementId: 'z1', beadIndex: 999 }, new Map(), toothMeshes,
    )).toBeNull();
  });
});

describe('pendantAnchorsEqual', () => {
  it('grid anchors are equal by col', () => {
    expect(pendantAnchorsEqual({ kind: 'grid', col: 2 }, { kind: 'grid', col: 2 })).toBe(true);
    expect(pendantAnchorsEqual({ kind: 'grid', col: 2 }, { kind: 'grid', col: 3 })).toBe(false);
  });

  it('tooth anchors are equal by placementId AND beadIndex', () => {
    expect(pendantAnchorsEqual(
      { kind: 'tooth', placementId: 'z1', beadIndex: 0 }, { kind: 'tooth', placementId: 'z1', beadIndex: 0 },
    )).toBe(true);
    expect(pendantAnchorsEqual(
      { kind: 'tooth', placementId: 'z1', beadIndex: 0 }, { kind: 'tooth', placementId: 'z2', beadIndex: 0 },
    )).toBe(false);
    expect(pendantAnchorsEqual(
      { kind: 'tooth', placementId: 'z1', beadIndex: 0 }, { kind: 'tooth', placementId: 'z1', beadIndex: 1 },
    )).toBe(false);
  });

  it('a grid anchor never equals a tooth anchor', () => {
    expect(pendantAnchorsEqual(
      { kind: 'grid', col: 0 }, { kind: 'tooth', placementId: 'z1', beadIndex: 0 },
    )).toBe(false);
  });
});

describe('mirrorPendantAnchor', () => {
  const width = 10;

  it('mirrors a grid anchor by col c <-> width-1-c', () => {
    expect(mirrorPendantAnchor({ kind: 'grid', col: 2 }, [], width)).toEqual({ kind: 'grid', col: 7 });
  });

  it('mirrors a tooth anchor to its mirrored tooth placement, keeping the same beadIndex', () => {
    const tooth: ToothPlacement = { placementId: 'a', startCol: 2, endCol: 4, colorMap: {} };
    const mirror: ToothPlacement = { placementId: 'b', startCol: 5, endCol: 7, colorMap: {} };
    expect(mirrorPendantAnchor({ kind: 'tooth', placementId: 'a', beadIndex: 3 }, [tooth, mirror], width))
      .toEqual({ kind: 'tooth', placementId: 'b', beadIndex: 3 });
  });

  it('returns null for a tooth anchor with no mirrored tooth', () => {
    const tooth: ToothPlacement = { placementId: 'a', startCol: 2, endCol: 4, colorMap: {} };
    expect(mirrorPendantAnchor({ kind: 'tooth', placementId: 'a', beadIndex: 0 }, [tooth], width)).toBeNull();
  });

  it('returns null for a tooth anchor referencing an unknown placementId', () => {
    expect(mirrorPendantAnchor({ kind: 'tooth', placementId: 'gone', beadIndex: 0 }, [], width)).toBeNull();
  });
});
