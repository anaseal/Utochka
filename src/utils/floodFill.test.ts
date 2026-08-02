import { describe, it, expect } from 'vitest';
import { computeUnifiedFloodFill } from './floodFill';
import { generateSilyankaGrid } from './generator';
import { Bead } from '../types/bead';
import {
  PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement, ToothPlacement,
} from '../types/pendant';
import { decorTailBeadId } from './decorTail';
import { computeToothMeshes, toothBeadId } from './tooth';

// Маленькая реальная сетка: width=3, height=1, span 3/3 (internal=1).
const beads: Bead[] = generateSilyankaGrid(3, 1, 65, 3, 3);
const bottomNodes = beads.filter(
  b => b.type === 'NODE' && b.logicalIndex.row === 2,
);

const noPendants: PendantPlacement[] = [];
const noTemplates: Record<string, PendantTemplate> = {};
describe('computeUnifiedFloodFill — basic grid behavior', () => {
  it('startColor === activeColor → empty result (nothing to fill)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      { 'node-0-0': 'red' },
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
    );
    expect(res).toEqual({
      gridIds: [], pendantHits: [], chainHits: [], decorTailHits: [], toothHits: [],
    });
  });

  it('uniformly transparent grid is filled entirely (graph is connected)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      {},
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
    );
    expect(new Set(res.gridIds)).toEqual(new Set(beads.map(b => b.id)));
    expect(res.pendantHits).toHaveLength(0);
  });

  it('a bead of a different color does not get filled (barrier)', () => {
    const res = computeUnifiedFloodFill(
      'node-0-0',
      beads,
      { 'node-0-1': 'blue' }, // сосед покрашен иначе
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
    );
    expect(res.gridIds).not.toContain('node-0-1');
    // остальная прозрачная сетка всё равно залита
    expect(res.gridIds).toContain('node-0-0');
    expect(res.gridIds.length).toBeGreaterThan(1);
  });
});

describe('computeUnifiedFloodFill — grid ↔ pendant transition', () => {
  const template: PendantTemplate = {
    id: 't1',
    name: 'test',
    beads: [
      { dx: 0, dy: 10, shape: 'circle', type: 'SPAN' },
      { dx: 0, dy: 20, shape: 'circle', type: 'SPAN' },
    ],
    links: [[0, 1]],
  };
  const templates = { t1: template };
  // Якорь — нода нижнего ряда в колонке 1.
  const placement: PendantPlacement = {
    placementId: 'p1',
    templateId: 't1',
    anchor: { kind: 'grid', col: 1 },
    colorMap: {},
  };

  it('fill flows through the anchor node into pendant beads', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [placement],
      templates,
      bottomNodes,
      bottomNodes,
    );
    expect(res.pendantHits).toEqual(
      expect.arrayContaining([
        { placementId: 'p1', index: 0 },
        { placementId: 'p1', index: 1 },
      ]),
    );
  });

  it('a pendant with a different anchor bead color is not filled', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [{ ...placement, colorMap: { 0: 'blue' } }],
      templates,
      bottomNodes,
      bottomNodes,
    );
    expect(res.pendantHits).toHaveLength(0);
  });
});

describe('computeUnifiedFloodFill — grid ↔ decor tail transition', () => {
  // Хвост длиной 2 на колонке 1 нижнего ряда.
  const tail: DecorTailPlacement = {
    placementId: 'd1',
    col: 1,
    rows: 2,
    colorMap: {},
  };

  it('fill flows through the anchor node into decor tail beads', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
      [],
      [tail],
    );
    expect(res.decorTailHits).toEqual(
      expect.arrayContaining([
        { placementId: 'd1', index: 0 },
        { placementId: 'd1', index: 1 },
      ]),
    );
  });

  it('a decor tail with a different anchor bead color is not filled', () => {
    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      noPendants,
      noTemplates,
      bottomNodes,
      bottomNodes,
      [],
      [{ ...tail, colorMap: { 0: 'blue' } }],
    );
    expect(res.decorTailHits).toHaveLength(0);
  });

  it('a pendant anchored on a decor tail tip fills through the tail, not the node', () => {
    const template: PendantTemplate = {
      id: 't1',
      name: 'test',
      beads: [{ dx: 0, dy: 10, shape: 'circle', type: 'SPAN' }],
      links: [],
    };
    const placement: PendantPlacement = {
      placementId: 'p1',
      templateId: 't1',
      anchor: { kind: 'grid', col: 1 },
      colorMap: {},
    };
    // pendantAnchorNodes подменяет якорь колонки 1 на кончик хвоста (index 1) —
    // так же, как это делает pendantAnchors в useSilyankaProject.ts.
    const tailTipAnchor: Bead = {
      ...bottomNodes[1],
      id: decorTailBeadId('d1', 1),
    };
    const pendantAnchorNodes = bottomNodes.map(n => (n.logicalIndex.col === 1 ? tailTipAnchor : n));

    const res = computeUnifiedFloodFill(
      'node-2-1',
      beads,
      {},
      'red',
      [placement],
      { t1: template },
      pendantAnchorNodes,
      bottomNodes,
      [],
      [tail],
    );
    expect(res.decorTailHits).toEqual(
      expect.arrayContaining([
        { placementId: 'd1', index: 0 },
        { placementId: 'd1', index: 1 },
      ]),
    );
    expect(res.pendantHits).toEqual([{ placementId: 'p1', index: 0 }]);
  });
});

describe('computeUnifiedFloodFill — grid ↔ chain transition', () => {
  const chain: PendantChain = {
    placementId: 'c1',
    start: { kind: 'grid', col: 0 },
    end: { kind: 'grid', col: 2 },
    colorMap: {},
  };

  it('fill flows through both anchor nodes into chain beads', () => {
    const res = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes, [chain],
    );
    expect(res.chainHits.length).toBeGreaterThan(0);
  });

  it('fill starting from either end reaches the same chain beads', () => {
    const fromStart = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes, [chain],
    );
    const fromEnd = computeUnifiedFloodFill(
      'node-2-2', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes, [chain],
    );
    expect(new Set(fromStart.chainHits.map(h => h.index)))
      .toEqual(new Set(fromEnd.chainHits.map(h => h.index)));
  });

  it('a differently-colored chain bead itself is not filled through', () => {
    // Оба конца этой цепочки — реальные узлы сетки, а сетка полностью
    // связна (даже через верх полотна), поэтому окрашенная в другой цвет
    // бисерина 0 не «изолирует» всю цепочку целиком (остальные бисерины
    // всё равно достижимы со стороны второго конца) — но саму бисерину 0
    // залить нельзя ни с одной из сторон, это и проверяем.
    const res = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes,
      [{ ...chain, colorMap: { 0: 'blue' } }],
    );
    expect(res.chainHits.map(h => h.index)).not.toContain(0);
  });
});

describe('computeUnifiedFloodFill — grid ↔ tooth transition', () => {
  // Зубец на всю ширину сетки (col 0 → col 2) — оба конца полосы настоящие,
  // rows = getToothRows(0, 2) = 2 (см. tooth.ts).
  const tooth: ToothPlacement = { placementId: 'z1', startCol: 0, endCol: 2, colorMap: {} };
  const toothMeshes = computeToothMeshes([tooth], bottomNodes, 65, 3);

  it('fill flows through the anchor nodes into tooth mesh beads', () => {
    const res = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes,
      [], [], [tooth], toothMeshes,
    );
    expect(res.toothHits.length).toBeGreaterThan(0);
  });

  it('a differently-colored tooth mesh bead itself is not filled through', () => {
    // Этот зубец занимает всю ширину сетки — все три нижних узла его якоря,
    // а сетка полностью связна (даже через верх полотна), поэтому окрашенная
    // в другой цвет бисерина 0 не «изолирует» весь меш целиком (остальные
    // бисерины всё равно достижимы через другие настоящие якоря) — но саму
    // бисерину 0 залить нельзя ни с одной стороны, это и проверяем.
    const res = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes,
      [], [], [{ ...tooth, colorMap: { 0: 'blue' } }], toothMeshes,
    );
    expect(res.toothHits.map(h => h.index)).not.toContain(0);
  });

  it('fill starting from either real anchor of the strip reaches the same mesh beads', () => {
    const fromStart = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes,
      [], [], [tooth], toothMeshes,
    );
    const fromEnd = computeUnifiedFloodFill(
      'node-2-2', beads, {}, 'red', noPendants, noTemplates, bottomNodes, bottomNodes,
      [], [], [tooth], toothMeshes,
    );
    expect(new Set(fromStart.toothHits.map(h => h.index)))
      .toEqual(new Set(fromEnd.toothHits.map(h => h.index)));
  });
});

describe('computeUnifiedFloodFill — tooth ↔ chain transition', () => {
  // Зубец на col 0 → col 1 (не на всю ширину) — col 2 остаётся свободным
  // грид-узлом для другого конца цепочки.
  const tooth: ToothPlacement = { placementId: 'z1', startCol: 0, endCol: 1, colorMap: {} };
  const toothMeshes = computeToothMeshes([tooth], bottomNodes, 65, 3);
  const mesh = toothMeshes.get('z1')!;
  // Кончик — единственная бисерина с обеими сторонами сразу (см. tooth.test.ts).
  const tipIndex = mesh.beads.findIndex(b => (b.side?.length ?? 0) === 2);
  const chain: PendantChain = {
    placementId: 'c1',
    start: { kind: 'tooth', placementId: 'z1', beadIndex: tipIndex },
    end: { kind: 'grid', col: 2 },
    colorMap: {},
  };
  // node-2-0/node-2-1 — настоящие якоря зубца (mesh.anchors); красим их в
  // барьерный цвет, чтобы единственным путём наружу из меша остался именно
  // новый chainRoots-переход из isToothBeadId-ветки neighborsOf, а не старая
  // связь через mesh.anchors.
  const designMap = { 'node-2-0': 'blue', 'node-2-1': 'blue' };

  it('fill starting at the tooth tip reaches the far grid node only through the chain', () => {
    const res = computeUnifiedFloodFill(
      toothBeadId('z1', tipIndex), beads, designMap, 'red', noPendants, noTemplates,
      bottomNodes, bottomNodes, [chain], [], [tooth], toothMeshes,
    );
    expect(res.chainHits.length).toBeGreaterThan(0);
    expect(res.gridIds).toContain('node-2-2');
    expect(res.gridIds).not.toContain('node-2-0');
    expect(res.gridIds).not.toContain('node-2-1');
  });
});

describe('computeUnifiedFloodFill — grid ↔ pendant-on-tooth transition', () => {
  // Зубец на всю ширину — точечная подвеска повешена на его кончик
  // (PendantAnchor{kind:'tooth', placementId, beadIndex}, см. spec.md,
  // «Зубец») — но с тем же успехом это мог быть любой другой узел-граница.
  const tooth: ToothPlacement = { placementId: 'z1', startCol: 0, endCol: 2, colorMap: {} };
  const toothMeshes = computeToothMeshes([tooth], bottomNodes, 65, 3);
  const tipIndex = toothMeshes.get('z1')!.tipIndex;
  const template: PendantTemplate = {
    id: 't1',
    name: 'test',
    beads: [{ dx: 0, dy: 10, shape: 'circle', type: 'SPAN' }],
    links: [],
  };
  const placement: PendantPlacement = {
    placementId: 'p1',
    templateId: 't1',
    anchor: { kind: 'tooth', placementId: 'z1', beadIndex: tipIndex },
    colorMap: {},
  };

  it('fill flows from a grid anchor through the tooth mesh into the pendant bead', () => {
    const res = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', [placement], { t1: template },
      bottomNodes, bottomNodes, [], [], [tooth], toothMeshes,
    );
    expect(res.pendantHits).toEqual([{ placementId: 'p1', index: 0 }]);
    expect(res.toothHits.length).toBeGreaterThan(0);
  });

  it('a pendant with a different anchor bead color is not filled', () => {
    const res = computeUnifiedFloodFill(
      'node-2-0', beads, {}, 'red', [{ ...placement, colorMap: { 0: 'blue' } }], { t1: template },
      bottomNodes, bottomNodes, [], [], [tooth], toothMeshes,
    );
    expect(res.pendantHits).toHaveLength(0);
  });
});
