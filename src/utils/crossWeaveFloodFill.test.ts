import { describe, it, expect } from 'vitest';
import { computeCrossWeaveFloodFill } from './crossWeaveFloodFill';
import { generateCrossWeaveGrid } from './crossWeaveGenerator';

// width=3, height=3 → 7 beads total: row0 (vertical, shifted) bead-0-0/1,
// row1 (horizontal) bead-1-0/1/2, row2 (vertical) bead-2-0/1 — the whole
// grid forms one connected component through the alternating diagonals.
const beads = generateCrossWeaveGrid(3, 3, 14, 14);
const DEFAULT_COLOR = 'transparent';

describe('computeCrossWeaveFloodFill — basic behavior', () => {
  it('startColor === activeColor → nothing to fill', () => {
    const result = computeCrossWeaveFloodFill(
      'bead-0-0',
      beads,
      { 'bead-0-0': 'red' },
      'red',
      DEFAULT_COLOR,
    );
    expect(result).toEqual([]);
  });

  it('a uniformly colored (default) grid is filled entirely — the graph is connected', () => {
    const result = computeCrossWeaveFloodFill('bead-0-0', beads, {}, 'red', DEFAULT_COLOR);
    expect(new Set(result)).toEqual(new Set(beads.map(b => b.id)));
  });

  it('a differently colored bead blocks the fill from crossing it', () => {
    const result = computeCrossWeaveFloodFill(
      'bead-0-0',
      beads,
      { 'bead-1-1': 'blue' },
      'red',
      DEFAULT_COLOR,
    );
    // reachable without passing through the blocked bead-1-1
    expect(new Set(result)).toEqual(new Set(['bead-0-0', 'bead-1-0', 'bead-2-0']));
    expect(result).not.toContain('bead-1-1');
    // only reachable through bead-1-1 → stays unfilled on the far side
    expect(result).not.toContain('bead-0-1');
    expect(result).not.toContain('bead-1-2');
    expect(result).not.toContain('bead-2-1');
  });
});
