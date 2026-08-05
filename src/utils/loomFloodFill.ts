import { LoomBead } from '../types/loomBead';

type AdjMap = Map<string, string[]>;

const addEdge = (map: AdjMap, a: string, b: string) => {
  map.get(a)?.push(b);
  map.get(b)?.push(a);
};

// Соседство Loom — простое ортогональное (r,c) ↔ (r±1,c) и (r,c) ↔ (r,c±1):
// прямая матрица без сдвига рядов (см. loomGenerator.ts), поэтому, в отличие
// от peyoteFloodFill.ts/crossWeaveFloodFill.ts, не нужна чётность — только
// проверка границ сетки. Обход только «вперёд» (следующая строка и следующая
// колонка) достаточен — addEdge пишет связь в обе стороны.
function buildAdjacencyMap(beads: LoomBead[]): AdjMap {
  const ids = new Set(beads.map(b => b.id));
  const map: AdjMap = new Map(beads.map(b => [b.id, []]));

  for (const bead of beads) {
    const { row: r, col: c } = bead.logicalIndex;
    const down = `loom-${r + 1}-${c}`;
    if (ids.has(down)) addEdge(map, bead.id, down);
    const right = `loom-${r}-${c + 1}`;
    if (ids.has(right)) addEdge(map, bead.id, right);
  }

  return map;
}

// Заливка для Loom: BFS по графу физической смежности бисерин (один тип
// бисерины, нет node/span/pendant) — по образцу computePeyoteFloodFill.
export function computeLoomFloodFill(
  startId: string,
  beads: LoomBead[],
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
