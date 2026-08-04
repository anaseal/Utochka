import { PeyoteBead } from '../types/peyoteBead';

type AdjMap = Map<string, string[]>;

const addEdge = (map: AdjMap, a: string, b: string) => {
  map.get(a)?.push(b);
  map.get(b)?.push(a);
};

// Соседи бисерины peyote-r-c в следующей строке (r+1) — та же геометрия, что
// в peyoteGenerator.ts/peyoteMirror.ts: чётный ряд (не сдвинут) касается
// (r+1, c-1) и (r+1, c) следующего (сдвинутого) ряда; нечётный (сдвинут)
// касается (r+1, c) и (r+1, c+1) следующего (не сдвинутого). У крайних
// колонок один из кандидатов физически не существует — это и даёт зубчатый
// край без отдельной санитизации. Обход только «вперёд» (r+1) достаточен —
// addEdge пишет связь в обе стороны.
const neighborCols = (r: number, c: number): [number, number] =>
  r % 2 === 0 ? [c - 1, c] : [c, c + 1];

function buildAdjacencyMap(beads: PeyoteBead[]): AdjMap {
  const ids = new Set(beads.map(b => b.id));
  const map: AdjMap = new Map(beads.map(b => [b.id, []]));

  for (const bead of beads) {
    const { row: r, col: c } = bead.logicalIndex;
    const [c0, c1] = neighborCols(r, c);
    for (const nc of [c0, c1]) {
      const neighborId = `peyote-${r + 1}-${nc}`;
      if (ids.has(neighborId)) addEdge(map, bead.id, neighborId);
    }
  }

  return map;
}

// Заливка для Peyote: BFS по графу физической смежности бисерин (один тип
// бисерины, нет node/span/pendant) — по образцу computeCrossWeaveFloodFill.
export function computePeyoteFloodFill(
  startId: string,
  beads: PeyoteBead[],
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
