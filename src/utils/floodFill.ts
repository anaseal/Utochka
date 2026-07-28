import { Bead } from '../types/bead';
import { defaultColorFor } from '../config/theme';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement } from '../types/pendant';
import { decode, encode } from './beadId';
import { chainBeadId, isChainBeadId, parseChainBeadId, chainBeadCountBetween } from './pendantChain';
import { decorTailBeadId, isDecorTailBeadId, parseDecorTailBeadId } from './decorTail';

type AdjMap = Map<string, string[]>;

const addEdge = (map: AdjMap, a: string, b: string) => {
  map.get(a)?.push(b);
  map.get(b)?.push(a);
};

// Узлы-концы цепочки vertEdge-бисерин: чётность ряда определяет, к каким
// узлам следующего ряда примыкают left/right-грани (см. generator.ts:155-166).
function vertEdgeEndpoints(r: number, c: number, side: 'left' | 'right'): [string, string] {
  const even = r % 2 === 0;
  const start = encode({ kind: 'node', r, c });
  if (even) {
    return side === 'left'
      ? [start, encode({ kind: 'node', r: r + 1, c: c - 1 })]
      : [start, encode({ kind: 'node', r: r + 1, c })];
  }
  return side === 'left'
    ? [start, encode({ kind: 'node', r: r + 1, c })]
    : [start, encode({ kind: 'node', r: r + 1, c: c + 1 })];
}

function buildAdjacencyMap(beads: Bead[]): AdjMap {
  const map: AdjMap = new Map(beads.map(b => [b.id, []]));

  const chains = new Map<string, { entries: [number, string][]; endpoints: [string, string] }>();
  const bottomChains = new Map<string, { row: number; c: number; entries: [number, string][] }>();
  const decorGroups = new Map<number, Map<number, Map<number, string>>>();

  for (const bead of beads) {
    const ref = decode(bead.id);
    if (!ref) continue;

    switch (ref.kind) {
      case 'topLink': {
        const key = `topLink-${ref.c}`;
        if (!chains.has(key)) {
          chains.set(key, {
            entries: [],
            endpoints: [encode({ kind: 'node', r: 0, c: ref.c }), encode({ kind: 'node', r: 0, c: ref.c + 1 })],
          });
        }
        chains.get(key)!.entries.push([ref.i, bead.id]);
        break;
      }

      case 'bottomLink': {
        const key = `bottomLink-${ref.c}`;
        if (!bottomChains.has(key)) {
          bottomChains.set(key, { row: bead.logicalIndex.row, c: ref.c, entries: [] });
        }
        bottomChains.get(key)!.entries.push([ref.i, bead.id]);
        break;
      }

      case 'vertEdge': {
        const key = `vertEdge-${ref.r}-${ref.c}-${ref.side}`;
        if (!chains.has(key)) {
          chains.set(key, { entries: [], endpoints: vertEdgeEndpoints(ref.r, ref.c, ref.side) });
        }
        chains.get(key)!.entries.push([ref.i, bead.id]);
        break;
      }

      case 'decor': {
        if (!decorGroups.has(ref.r)) decorGroups.set(ref.r, new Map());
        const kMap = decorGroups.get(ref.r)!;
        if (!kMap.has(ref.k)) kMap.set(ref.k, new Map());
        kMap.get(ref.k)!.set(ref.c, bead.id);
        break;
      }

      case 'node':
        break;
    }
  }

  // Chain: startNode → bead-1 → ... → bead-N → endNode
  for (const { entries, endpoints } of chains.values()) {
    entries.sort((a, b) => a[0] - b[0]);
    const ids = entries.map(e => e[1]);
    if (ids.length === 0) continue;

    if (map.has(endpoints[0])) addEdge(map, endpoints[0], ids[0]);
    for (let i = 0; i < ids.length - 1; i++) addEdge(map, ids[i], ids[i + 1]);
    if (map.has(endpoints[1])) addEdge(map, endpoints[1], ids[ids.length - 1]);
  }

  // Bottom chain: node-{row}-c ← bead-1 → ... → bead-N → node-{row}-{c+1}
  for (const { row, c, entries } of bottomChains.values()) {
    const ep0 = encode({ kind: 'node', r: row, c });
    const ep1 = encode({ kind: 'node', r: row, c: c + 1 });

    entries.sort((a, b) => a[0] - b[0]);
    const ids = entries.map(e => e[1]);
    if (ids.length === 0) continue;

    if (map.has(ep0)) addEdge(map, ep0, ids[0]);
    for (let i = 0; i < ids.length - 1; i++) addEdge(map, ids[i], ids[i + 1]);
    if (map.has(ep1)) addEdge(map, ep1, ids[ids.length - 1]);
  }

  // Decor: horizontal within k-row, vertical between k and k+1
  for (const kMap of decorGroups.values()) {
    const kList = [...kMap.keys()].sort((a, b) => a - b);
    for (const k of kList) {
      const cMap = kMap.get(k)!;
      const cList = [...cMap.keys()].sort((a, b) => a - b);

      for (let i = 0; i < cList.length - 1; i++) {
        addEdge(map, cMap.get(cList[i])!, cMap.get(cList[i + 1])!);
      }

      const nextCMap = kMap.get(k + 1);
      if (nextCMap) {
        for (const [c, id] of cMap) {
          const nextId = nextCMap.get(c);
          if (nextId) addEdge(map, id, nextId);
        }
      }
    }
  }

  return map;
}

const PENDANT_PREFIX = 'pendant:';

export const pendantBeadId = (placementId: string, beadIndex: number): string =>
  `${PENDANT_PREFIX}${placementId}:${beadIndex}`;

interface PendantHit {
  placementId: string;
  index: number;
}

interface ChainHit {
  placementId: string;
  index: number;
}

interface DecorTailHit {
  placementId: string;
  index: number;
}

interface UnifiedFloodFillResult {
  gridIds: string[];
  pendantHits: PendantHit[];
  chainHits: ChainHit[];
  decorTailHits: DecorTailHit[];
}

// Заливка через сетку, подвески, цепочки-подвески и декор-хвосты как единый
// граф: подвеска соединена с сеткой через свою якорную ноду (beads[0] всегда
// касается ноды нижнего ряда — или кончика декор-хвоста той же колонки, если
// он есть, см. pendantAnchorNodes), цепочка — через оба конца (startCol/endCol
// на нижнем ряду), хвост — через свою якорную ноду (всегда настоящую, хвост
// не может расти из другого хвоста).
export function computeUnifiedFloodFill(
  startId: string,
  beads: Bead[],
  designMap: Record<string, string>,
  activeColor: string,
  placements: PendantPlacement[],
  templates: Record<string, PendantTemplate>,
  // Якорь ПОДВЕСКИ на колонку: настоящая нода нижнего ряда, либо — если на
  // этой колонке есть декор-хвост — его последняя бисерина (см.
  // pendantAnchors в useSilyankaProject.ts). Позволяет подвеске «висеть на
  // хвосте, как на ноде», не меняя код ниже.
  pendantAnchorNodes: Bead[],
  // Настоящие ноды нижнего ряда — якорь цепочек и декор-хвостов (те всегда
  // растут из ноды, а не из другого декора).
  bottomNodes: Bead[],
  chains: PendantChain[] = [],
  decorTails: DecorTailPlacement[] = [],
): UnifiedFloodFillResult {
  const beadMap = new Map(beads.map(b => [b.id, b]));
  const pendantAnchorByCol = new Map<number, Bead>();
  pendantAnchorNodes.forEach(n => pendantAnchorByCol.set(n.logicalIndex.col, n));
  const bottomNodeByCol = new Map<number, Bead>();
  bottomNodes.forEach(n => bottomNodeByCol.set(n.logicalIndex.col, n));
  const placementById = new Map(placements.map(p => [p.placementId, p]));
  const chainById = new Map(chains.map(c => [c.placementId, c]));
  const decorTailById = new Map(decorTails.map(t => [t.placementId, t]));

  const anchorPendants = (nodeId: string): PendantPlacement[] =>
    placements.filter(p => {
      const anchor = pendantAnchorByCol.get(p.col);
      return anchor?.id === nodeId && templates[p.templateId];
    });

  // Цепочки, у которых нода nodeId — один из двух концов (startCol/endCol).
  const anchorChains = (nodeId: string): { chain: PendantChain; isStart: boolean }[] => {
    const result: { chain: PendantChain; isStart: boolean }[] = [];
    for (const chain of chains) {
      const start = bottomNodeByCol.get(chain.startCol);
      const end = bottomNodeByCol.get(chain.endCol);
      if (start?.id === nodeId) result.push({ chain, isStart: true });
      if (end?.id === nodeId) result.push({ chain, isStart: false });
    }
    return result;
  };

  const chainCount = (chain: PendantChain): number => {
    const start = bottomNodeByCol.get(chain.startCol);
    const end = bottomNodeByCol.get(chain.endCol);
    if (!start || !end) return 0;
    return chainBeadCountBetween(start, end);
  };

  // Хвосты, у которых нода nodeId — якорь (col).
  const anchorDecorTails = (nodeId: string): DecorTailPlacement[] =>
    decorTails.filter(t => bottomNodeByCol.get(t.col)?.id === nodeId);

  const parsePendantId = (id: string): [string, number] => {
    const [, placementId, idxStr] = id.split(':');
    return [placementId, Number(idxStr)];
  };

  const effectiveColor = (id: string): string => {
    if (id.startsWith(PENDANT_PREFIX)) {
      const [placementId, index] = parsePendantId(id);
      const p = placementById.get(placementId);
      const beadDef = p ? templates[p.templateId]?.beads[index] : undefined;
      return p?.colorMap[index] ?? defaultColorFor(beadDef?.type ?? 'SPAN');
    }
    if (isChainBeadId(id)) {
      const [placementId, index] = parseChainBeadId(id);
      return chainById.get(placementId)?.colorMap[index] ?? defaultColorFor('SPAN');
    }
    if (isDecorTailBeadId(id)) {
      const [placementId, index] = parseDecorTailBeadId(id);
      return decorTailById.get(placementId)?.colorMap[index] ?? defaultColorFor('SPAN');
    }
    return designMap[id] ?? defaultColorFor(beadMap.get(id)?.type ?? 'SPAN');
  };

  const startColor = effectiveColor(startId);
  if (startColor === activeColor) return { gridIds: [], pendantHits: [], chainHits: [], decorTailHits: [] };

  const adjMap = buildAdjacencyMap(beads);

  const neighborsOf = (id: string): string[] => {
    if (id.startsWith(PENDANT_PREFIX)) {
      const [placementId, index] = parsePendantId(id);
      const p = placementById.get(placementId);
      const template = p ? templates[p.templateId] : undefined;
      if (!p || !template) return [];
      const result: string[] = [];
      for (const [a, b] of template.links) {
        if (a === index) result.push(pendantBeadId(placementId, b));
        else if (b === index) result.push(pendantBeadId(placementId, a));
      }
      if (index === 0) {
        const anchor = pendantAnchorByCol.get(p.col);
        if (anchor) result.push(anchor.id);
      }
      return result;
    }
    if (isChainBeadId(id)) {
      const [placementId, index] = parseChainBeadId(id);
      const chain = chainById.get(placementId);
      if (!chain) return [];
      const count = chainCount(chain);
      const result: string[] = [];
      if (index > 0) {
        result.push(chainBeadId(placementId, index - 1));
      } else {
        const startAnchor = bottomNodeByCol.get(chain.startCol);
        if (startAnchor) result.push(startAnchor.id);
      }
      if (index < count - 1) {
        result.push(chainBeadId(placementId, index + 1));
      } else {
        const endAnchor = bottomNodeByCol.get(chain.endCol);
        if (endAnchor) result.push(endAnchor.id);
      }
      return result;
    }
    if (isDecorTailBeadId(id)) {
      const [placementId, index] = parseDecorTailBeadId(id);
      const tail = decorTailById.get(placementId);
      if (!tail) return [];
      const result: string[] = [];
      if (index > 0) {
        result.push(decorTailBeadId(placementId, index - 1));
      } else {
        const anchor = bottomNodeByCol.get(tail.col);
        if (anchor) result.push(anchor.id);
      }
      if (index < tail.rows - 1) {
        result.push(decorTailBeadId(placementId, index + 1));
      } else {
        // Кончик хвоста — сам якорь для обычной подвески той же колонки
        // (см. pendantAnchorNodes выше) — подвеска «висит на хвосте, как на ноде».
        const pendantRoots = anchorPendants(id).map(p => pendantBeadId(p.placementId, 0));
        result.push(...pendantRoots);
      }
      return result;
    }
    const gridNeighbors = adjMap.get(id) ?? [];
    const pendantRoots = anchorPendants(id).map(p => pendantBeadId(p.placementId, 0));
    const chainRoots = anchorChains(id).map(({ chain, isStart }) =>
      chainBeadId(chain.placementId, isStart ? 0 : Math.max(0, chainCount(chain) - 1)));
    const decorTailRoots = anchorDecorTails(id).map(t => decorTailBeadId(t.placementId, 0));
    return [...gridNeighbors, ...pendantRoots, ...chainRoots, ...decorTailRoots];
  };

  const visited = new Set([startId]);
  const queue = [startId];
  const gridIds: string[] = [];
  const pendantHits: PendantHit[] = [];
  const chainHits: ChainHit[] = [];
  const decorTailHits: DecorTailHit[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.startsWith(PENDANT_PREFIX)) {
      const [placementId, index] = parsePendantId(current);
      pendantHits.push({ placementId, index });
    } else if (isChainBeadId(current)) {
      const [placementId, index] = parseChainBeadId(current);
      chainHits.push({ placementId, index });
    } else if (isDecorTailBeadId(current)) {
      const [placementId, index] = parseDecorTailBeadId(current);
      decorTailHits.push({ placementId, index });
    } else {
      gridIds.push(current);
    }
    for (const neighbor of neighborsOf(current)) {
      if (!visited.has(neighbor) && effectiveColor(neighbor) === startColor) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return { gridIds, pendantHits, chainHits, decorTailHits };
}
