import { Bead } from '../types/bead';
import { defaultColorFor } from '../config/theme';
import { PendantPlacement, PendantTemplate } from '../types/pendant';

type AdjMap = Map<string, string[]>;

const TOP_LINK_BEAD_RE = /^span-edge-top-link-(\d+)-bead-(\d+)$/;
const BOTTOM_LINK_BEAD_RE = /^span-edge-bottom-link-(\d+)-bead-(\d+)$/;
const VERT_EDGE_BEAD_RE = /^span-edge-(\d+)-(\d+)-(left|right)-bead-(\d+)$/;
const DECOR_RE = /^decor-(\d+)-(\d+)-(\d+)$/;

const addEdge = (map: AdjMap, a: string, b: string) => {
  map.get(a)?.push(b);
  map.get(b)?.push(a);
};

function chainEndpoints(clusterId: string): [string, string] | null {
  const topM = clusterId.match(/^edge-top-link-(\d+)$/);
  if (topM) {
    const c = Number(topM[1]);
    return [`node-0-${c}`, `node-0-${c + 1}`];
  }

  const edgeM = clusterId.match(/^edge-(\d+)-(\d+)-(left|right)$/);
  if (edgeM) {
    const r = Number(edgeM[1]);
    const c = Number(edgeM[2]);
    const side = edgeM[3];
    const even = r % 2 === 0;
    if (even) {
      return side === 'left'
        ? [`node-${r}-${c}`, `node-${r + 1}-${c - 1}`]
        : [`node-${r}-${c}`, `node-${r + 1}-${c}`];
    } else {
      return side === 'left'
        ? [`node-${r}-${c}`, `node-${r + 1}-${c}`]
        : [`node-${r}-${c}`, `node-${r + 1}-${c + 1}`];
    }
  }

  return null;
}

function buildAdjacencyMap(beads: Bead[]): AdjMap {
  const map: AdjMap = new Map(beads.map(b => [b.id, []]));

  const chains = new Map<string, [number, string][]>();
  const bottomChains = new Map<string, { row: number; entries: [number, string][] }>();
  const decorGroups = new Map<string, Map<number, Map<number, string>>>();

  for (const bead of beads) {
    const topM = bead.id.match(TOP_LINK_BEAD_RE);
    if (topM) {
      const key = `edge-top-link-${topM[1]}`;
      if (!chains.has(key)) chains.set(key, []);
      chains.get(key)!.push([Number(topM[2]), bead.id]);
      continue;
    }

    const botM = bead.id.match(BOTTOM_LINK_BEAD_RE);
    if (botM) {
      const c = Number(botM[1]);
      const key = `edge-bottom-link-${c}`;
      if (!bottomChains.has(key)) bottomChains.set(key, { row: bead.logicalIndex.row, entries: [] });
      bottomChains.get(key)!.entries.push([Number(botM[2]), bead.id]);
      continue;
    }

    const vertM = bead.id.match(VERT_EDGE_BEAD_RE);
    if (vertM) {
      const key = `edge-${vertM[1]}-${vertM[2]}-${vertM[3]}`;
      if (!chains.has(key)) chains.set(key, []);
      chains.get(key)!.push([Number(vertM[4]), bead.id]);
      continue;
    }

    const decorM = bead.id.match(DECOR_RE);
    if (decorM) {
      const r = decorM[1];
      const k = Number(decorM[2]);
      const c = Number(decorM[3]);
      if (!decorGroups.has(r)) decorGroups.set(r, new Map());
      const kMap = decorGroups.get(r)!;
      if (!kMap.has(k)) kMap.set(k, new Map());
      kMap.get(k)!.set(c, bead.id);
    }
  }

  // Chain: startNode → bead-1 → ... → bead-N → endNode
  for (const [clusterId, entries] of chains) {
    const eps = chainEndpoints(clusterId);
    if (!eps) continue;

    entries.sort((a, b) => a[0] - b[0]);
    const ids = entries.map(e => e[1]);
    if (ids.length === 0) continue;

    if (map.has(eps[0])) addEdge(map, eps[0], ids[0]);
    for (let i = 0; i < ids.length - 1; i++) addEdge(map, ids[i], ids[i + 1]);
    if (map.has(eps[1])) addEdge(map, eps[1], ids[ids.length - 1]);
  }

  // Bottom chain: node-{lastR}-c ← bead-1 → ... → bead-N → node-{lastR}-{c+1}
  for (const [key, { row, entries }] of bottomChains) {
    const cMatch = key.match(/^edge-bottom-link-(\d+)$/);
    if (!cMatch) continue;
    const c = Number(cMatch[1]);
    const ep0 = `node-${row}-${c}`;
    const ep1 = `node-${row}-${c + 1}`;

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

interface UnifiedFloodFillResult {
  gridIds: string[];
  pendantHits: PendantHit[];
}

// Заливка через сетку и подвески как единый граф: подвеска соединена с сеткой
// через свою якорную ноду (beads[0] всегда касается ноды нижнего ряда).
export function computeUnifiedFloodFill(
  startId: string,
  beads: Bead[],
  designMap: Record<string, string>,
  activeColor: string,
  placements: PendantPlacement[],
  templates: Record<string, PendantTemplate>,
  bottomNodes: Bead[],
): UnifiedFloodFillResult {
  const beadMap = new Map(beads.map(b => [b.id, b]));
  const nodeByCol = new Map<number, Bead>();
  bottomNodes.forEach(n => nodeByCol.set(n.logicalIndex.col, n));
  const placementById = new Map(placements.map(p => [p.placementId, p]));

  const anchorPendants = (nodeId: string): PendantPlacement[] =>
    placements.filter(p => {
      const anchor = nodeByCol.get(p.col);
      return anchor?.id === nodeId && templates[p.templateId];
    });

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
    return designMap[id] ?? defaultColorFor(beadMap.get(id)?.type ?? 'SPAN');
  };

  const startColor = effectiveColor(startId);
  if (startColor === activeColor) return { gridIds: [], pendantHits: [] };

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
        const anchor = nodeByCol.get(p.col);
        if (anchor) result.push(anchor.id);
      }
      return result;
    }
    const gridNeighbors = adjMap.get(id) ?? [];
    const pendantRoots = anchorPendants(id).map(p => pendantBeadId(p.placementId, 0));
    return [...gridNeighbors, ...pendantRoots];
  };

  const visited = new Set([startId]);
  const queue = [startId];
  const gridIds: string[] = [];
  const pendantHits: PendantHit[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.startsWith(PENDANT_PREFIX)) {
      const [placementId, index] = parsePendantId(current);
      pendantHits.push({ placementId, index });
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

  return { gridIds, pendantHits };
}
