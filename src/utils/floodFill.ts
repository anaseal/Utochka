import { Bead } from '../types/bead';
import { defaultColorFor } from '../config/theme';

type AdjMap = Map<string, string[]>;

const TOP_LINK_BEAD_RE = /^span-edge-top-link-(\d+)-bead-(\d+)$/;
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
  const decorGroups = new Map<string, Map<number, Map<number, string>>>();

  for (const bead of beads) {
    const topM = bead.id.match(TOP_LINK_BEAD_RE);
    if (topM) {
      const key = `edge-top-link-${topM[1]}`;
      if (!chains.has(key)) chains.set(key, []);
      chains.get(key)!.push([Number(topM[2]), bead.id]);
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

export function computeFloodFill(
  startId: string,
  beads: Bead[],
  designMap: Record<string, string>,
  activeColor: string,
): string[] {
  const beadMap = new Map(beads.map(b => [b.id, b]));
  const effectiveColor = (id: string): string =>
    designMap[id] ?? defaultColorFor(beadMap.get(id)?.type ?? 'SPAN');

  const startColor = effectiveColor(startId);
  if (startColor === activeColor) return [];

  const adjMap = buildAdjacencyMap(beads);
  const visited = new Set([startId]);
  const queue = [startId];
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    for (const neighbor of adjMap.get(current) ?? []) {
      if (!visited.has(neighbor) && effectiveColor(neighbor) === startColor) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return result;
}
