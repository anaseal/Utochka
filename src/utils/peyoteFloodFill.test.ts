import { describe, it, expect } from 'vitest';
import { computePeyoteFloodFill } from './peyoteFloodFill';
import { generatePeyoteGrid } from './peyoteGenerator';

// width=3, height=3 → 9 beads total, all rows the same width (unlike
// crossWeave). The zigzag adjacency (see peyoteFloodFill.ts) still connects
// the whole grid into one component through the alternating diagonals.
const beads = generatePeyoteGrid(3, 3, 14, 14);
const DEFAULT_COLOR = 'transparent';

describe('computePeyoteFloodFill — basic behavior', () => {
  it('startColor === activeColor → nothing to fill', () => {
    const result = computePeyoteFloodFill(
      'peyote-0-0',
      beads,
      { 'peyote-0-0': 'red' },
      'red',
      DEFAULT_COLOR,
    );
    expect(result).toEqual([]);
  });

  it('a uniformly colored (default) grid is filled entirely — the graph is connected', () => {
    const result = computePeyoteFloodFill('peyote-0-0', beads, {}, 'red', DEFAULT_COLOR);
    expect(new Set(result)).toEqual(new Set(beads.map(b => b.id)));
  });

  it('a differently colored bead blocks the fill from crossing it', () => {
    const result = computePeyoteFloodFill(
      'peyote-0-0',
      beads,
      { 'peyote-1-1': 'blue' },
      'red',
      DEFAULT_COLOR,
    );
    // reachable without passing through the blocked peyote-1-1
    expect(new Set(result)).toEqual(new Set([
      'peyote-0-0', 'peyote-1-0', 'peyote-0-1', 'peyote-2-0', 'peyote-2-1',
    ]));
    expect(result).not.toContain('peyote-1-1');
    // only reachable through peyote-1-1 → stays unfilled on the far side
    expect(result).not.toContain('peyote-0-2');
    expect(result).not.toContain('peyote-1-2');
    expect(result).not.toContain('peyote-2-2');
  });
});
