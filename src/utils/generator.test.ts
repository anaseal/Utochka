import { describe, it, expect } from 'vitest';
import { generateSilyankaGrid } from './generator';
import { decode } from './beadId';

// Тот же фикстур, что и в floodFill.test.ts: width=3, height=1, spacing=65,
// span 3/3 (internal=1 с каждой стороны). Числа ниже посчитаны вручную по
// формулам самого generator.ts (stepX=52, yStep=26, edgeArcHeight=13) —
// см. BEAD_THEME.gridDefaults.
describe('generateSilyankaGrid — basic shape (width=3, height=1, span 3/3)', () => {
  const beads = generateSilyankaGrid(3, 1, 65, 3, 3);
  const nodeIds = beads.filter(b => b.type === 'NODE').map(b => b.id);

  it('even rows have `width` nodes, odd rows have width+1 (default Edge Extension)', () => {
    expect(nodeIds.filter(id => id.startsWith('node-0-'))).toHaveLength(3);
    expect(nodeIds.filter(id => /^node-1-/.test(id))).toHaveLength(4);
    expect(nodeIds.filter(id => id.startsWith('node-2-'))).toHaveLength(3);
  });

  it('odd row gains an extra column c=-1 on the left via Edge Extension', () => {
    expect(nodeIds).toContain('node-1--1');
  });

  it('total bead count: 10 nodes + 2 top-link + 12 vert-edge spans', () => {
    expect(beads).toHaveLength(24);
    expect(beads.filter(b => b.type === 'NODE')).toHaveLength(10);
    expect(beads.filter(b => decode(b.id)?.kind === 'topLink')).toHaveLength(2);
    expect(beads.filter(b => decode(b.id)?.kind === 'vertEdge')).toHaveLength(12);
  });

  it('node coordinates: even rows unshifted, odd rows shifted by stepX/2, y grows by the vertical step', () => {
    const at = (id: string) => beads.find(b => b.id === id)!;
    expect(at('node-0-0')).toMatchObject({ x: 0, y: 0 });
    expect(at('node-0-2')).toMatchObject({ x: 104, y: 0 });
    expect(at('node-1--1')).toMatchObject({ x: -26, y: 26 });
    expect(at('node-1-2')).toMatchObject({ x: 130, y: 26 });
    expect(at('node-2-0')).toMatchObject({ x: 0, y: 52 });
  });

  it('top-link arc bead sits above the row (negative y) at the midpoint between neighboring nodes', () => {
    const link = beads.find(b => b.id === 'span-edge-top-link-0-bead-1')!;
    expect(link).toMatchObject({ x: 26, y: -13 });
  });

  it('vertical-edge span beads sit at the midpoint between a node and its diagonal neighbor', () => {
    const left = beads.find(b => b.id === 'span-edge-0-0-left-bead-1')!;
    const right = beads.find(b => b.id === 'span-edge-0-0-right-bead-1')!;
    expect(left).toMatchObject({ x: -13, y: 13 });
    expect(right).toMatchObject({ x: 13, y: 13 });
  });

  it('all bead ids are unique', () => {
    expect(new Set(beads.map(b => b.id)).size).toBe(beads.length);
  });
});

describe('generateSilyankaGrid — span count follows row parity (even=legs/bottomSpan, odd=shoulders/topSpan)', () => {
  // topSpan=5 (плечи, нечётные ряды), bottomSpan=3 (ножки, чётные)
  const beads = generateSilyankaGrid(3, 1, 65, 5, 3);
  const countSide = (r: number, c: number, side: 'left' | 'right') =>
    beads.filter(b => {
      const ref = decode(b.id);
      return ref?.kind === 'vertEdge' && ref.r === r && ref.c === c && ref.side === side;
    }).length;

  it('even row (r=0) uses bottomSpan → internal count = bottomSpan-2', () => {
    expect(countSide(0, 1, 'left')).toBe(1);
  });

  it('odd row (r=1) uses topSpan → internal count = topSpan-2', () => {
    expect(countSide(1, 1, 'left')).toBe(3);
  });
});

describe('generateSilyankaGrid — rowSpanOverrides', () => {
  it('overrides the span count of a specific node row', () => {
    const beads = generateSilyankaGrid(3, 1, 65, 3, 3, { 0: 6 });
    const countSide = (r: number, c: number, side: 'left' | 'right') =>
      beads.filter(b => {
        const ref = decode(b.id);
        return ref?.kind === 'vertEdge' && ref.r === r && ref.c === c && ref.side === side;
      }).length;
    expect(countSide(0, 1, 'left')).toBe(4);
  });

  it('overrides the top edge chain length via the special key -1', () => {
    const beads = generateSilyankaGrid(3, 1, 65, 3, 3, { [-1]: 6 });
    const topLinkCount = (c: number) =>
      beads.filter(b => {
        const ref = decode(b.id);
        return ref?.kind === 'topLink' && ref.c === c;
      }).length;
    expect(topLinkCount(0)).toBe(4);
  });
});

describe('generateSilyankaGrid — top/bottom edge chain toggle', () => {
  it('topEdgeEnabled=false removes the top-link arc beads entirely', () => {
    const withTop = generateSilyankaGrid(3, 1, 65, 3, 3);
    const withoutTop = generateSilyankaGrid(3, 1, 65, 3, 3, {}, {}, false, 3, true, true, false);
    expect(withTop.some(b => decode(b.id)?.kind === 'topLink')).toBe(true);
    expect(withoutTop.some(b => decode(b.id)?.kind === 'topLink')).toBe(false);
  });

  it('bottomEdgeEnabled=true adds bottom-link arc beads at the last row', () => {
    const withoutBottom = generateSilyankaGrid(3, 1, 65, 3, 3);
    const withBottom = generateSilyankaGrid(3, 1, 65, 3, 3, {}, {}, true, 3);
    expect(withoutBottom.some(b => decode(b.id)?.kind === 'bottomLink')).toBe(false);
    // internalBottom = bottomEdgeSpan(3)-2 = 1 bead per gap, 2 gaps (c=0,1) → 2 beads
    expect(withBottom.filter(b => decode(b.id)?.kind === 'bottomLink')).toHaveLength(2);
  });
});

describe('generateSilyankaGrid — dangling corner', () => {
  it('drops the corner node when both the edge chain and Edge Extension are disabled on that side', () => {
    const beads = generateSilyankaGrid(3, 1, 65, 3, 3, {}, {}, false, 3, false, true, false);
    expect(beads.some(b => b.id === 'node-0-0')).toBe(false);
    // the opposite corner keeps its Edge Extension → survives
    expect(beads.some(b => b.id === 'node-0-2')).toBe(true);
  });
});

describe('generateSilyankaGrid — Taper', () => {
  it('cuts columns near the tapered edge, decreasing by half a column per row toward full width', () => {
    const beads = generateSilyankaGrid(7, 3, 65, 3, 3, {}, {}, false, 3, true, true, true, {
      top: { rows: 2 },
      bottom: { rows: 0 },
      depth: 0,
    });
    const nodesInRow = (r: number) => beads.filter(b => b.type === 'NODE' && b.logicalIndex.row === r);
    expect(nodesInRow(0)).toHaveLength(3); // target=2 → columns 2..4 survive
    expect(nodesInRow(2)).toHaveLength(5); // target=1 → columns 1..5 survive
    expect(nodesInRow(4)).toHaveLength(7); // target=0 → back to full width
    expect(beads.some(b => b.id === 'node-0-0')).toBe(false);
    expect(beads.some(b => b.id === 'node-0-3')).toBe(true);
  });
});

describe('generateSilyankaGrid — Decor Bands', () => {
  const beads = generateSilyankaGrid(3, 1, 65, 3, 3, {}, { 0: 2 });
  const decorBeads = beads.filter(b => decode(b.id)?.kind === 'decor');

  it('inserts rows*width decor beads between the node row and the next one', () => {
    expect(decorBeads).toHaveLength(6); // 2 rows × 3 columns
  });

  it('decor rows sit directly under the node column, stacked by the decor row step', () => {
    // decorRowStep = max(65*0.2, spanRadius*2+2) = max(13, 14) = 14
    expect(beads.find(b => b.id === 'decor-0-1-0')).toMatchObject({ x: 0, y: 14 });
    expect(beads.find(b => b.id === 'decor-0-2-1')).toMatchObject({ x: 52, y: 28 });
  });

  it('pushes the next node row down by the full decor band height', () => {
    // without decor node-1-0 sits at y=26; the 2-row band (28px) pushes it to y=54
    expect(beads.find(b => b.id === 'node-1-0')).toMatchObject({ y: 54 });
  });

  it('diagonal span beads start from the bottom of the decor band, not from the node row', () => {
    const left = beads.find(b => b.id === 'span-edge-0-0-left-bead-1')!;
    expect(left.y).toBe(41); // starts at band bottom y=28, not node y=0
  });
});
