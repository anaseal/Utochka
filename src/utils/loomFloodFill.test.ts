import { describe, it, expect } from 'vitest';
import { computeLoomFloodFill } from './loomFloodFill';
import { generateLoomGrid } from './loomGenerator';

// width=3, height=3 → 9 beads total. Orthogonal adjacency (see
// loomFloodFill.ts) connects the whole grid into one component.
const beads = generateLoomGrid(3, 3, 14, 14);
const DEFAULT_COLOR = 'transparent';

describe('computeLoomFloodFill — basic behavior', () => {
  it('startColor === activeColor → nothing to fill', () => {
    const result = computeLoomFloodFill(
      'loom-0-0',
      beads,
      { 'loom-0-0': 'red' },
      'red',
      DEFAULT_COLOR,
    );
    expect(result).toEqual([]);
  });

  it('a uniformly colored (default) grid is filled entirely — the graph is connected', () => {
    const result = computeLoomFloodFill('loom-0-0', beads, {}, 'red', DEFAULT_COLOR);
    expect(new Set(result)).toEqual(new Set(beads.map(b => b.id)));
  });

  it('a differently colored bead blocks the fill from crossing it', () => {
    const result = computeLoomFloodFill(
      'loom-0-0',
      beads,
      { 'loom-1-1': 'blue' },
      'red',
      DEFAULT_COLOR,
    );
    // reachable without passing through the blocked loom-1-1 (orthogonal only,
    // so the diagonal loom-1-1 does not even block loom-0-1 → loom-1-... paths
    // it would need to go through directly)
    expect(new Set(result)).toEqual(new Set([
      'loom-0-0', 'loom-1-0', 'loom-0-1', 'loom-0-2', 'loom-1-2', 'loom-2-2',
      'loom-2-1', 'loom-2-0',
    ]));
    expect(result).not.toContain('loom-1-1');
  });
});
