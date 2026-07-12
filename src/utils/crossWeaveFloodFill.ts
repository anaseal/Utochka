import { CrossWeaveBead } from '../types/crossWeaveBead';

type AdjMap = Map<string, string[]>;

const addEdge = (map: AdjMap, a: string, b: string) => {
  map.get(a)?.push(b);
  map.get(b)?.push(a);
};

// Соседи бисерины bead-r-c в следующей строке (r+1, другая ориентация) — та
// же геометрия, что у vertEdgeEndpoints в силяночном floodFill.ts: вертикальная
// бисерина (r чётный) лежит между горизонтальными c и c+1 следующего ряда,
// горизонтальная (r нечётный) — между вертикальными c-1 и c (см.
// crossWeaveGenerator.ts / crossWeaveMirror.ts — та же чётность там уже
// используется). Обход только "вперёд" (r+1) достаточен — addEdge пишет
// связь в обе стороны, поэтому от каждого ряда к следующему связь строится
// один раз.
const neighborCols = (r: number, c: number): [number, number] =>
  r % 2 === 0 ? [c, c + 1] : [c - 1, c];

function buildAdjacencyMap(beads: CrossWeaveBead[]): AdjMap {
  const ids = new Set(beads.map(b => b.id));
  const map: AdjMap = new Map(beads.map(b => [b.id, []]));

  for (const bead of beads) {
    const { row: r, col: c } = bead.logicalIndex;
    const [c0, c1] = neighborCols(r, c);
    for (const nc of [c0, c1]) {
      const neighborId = `bead-${r + 1}-${nc}`;
      if (ids.has(neighborId)) addEdge(map, bead.id, neighborId);
    }
  }

  return map;
}

// Заливка для CrossWeave: BFS по графу физической смежности бисерин (один
// тип бисерины, нет node/span/pendant — в отличие от силяночного floodFill.ts).
export function computeCrossWeaveFloodFill(
  startId: string,
  beads: CrossWeaveBead[],
  designMap: Record<string, string>,
  activeColor: string,
  defaultColor: string,
): string[] {
  const effectiveColor = (id: string): string => designMap[id] ?? defaultColor;

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
