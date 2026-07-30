import { Bead } from '../types/bead';
import { ToothPlacement } from '../types/pendant';
import { BEAD_THEME } from '../config/theme';

// Отдельное пространство ID для бисерин зубца — не пересекается ни с id
// основной сетки (beadId.ts), ни с pendant:*/chain:*/decorTail:* (см.
// floodFill.ts/pendantChain.ts/decorTail.ts). Индекс — плоский, по порядку
// генерации меша (computeToothMesh) — та же схема, что у chainBeadId/
// decorTailBeadId, а не двумерная по (ряд, колонка): проще и для colorMap,
// и для истории Undo/Redo.
const TOOTH_PREFIX = 'tooth:';

export const toothBeadId = (placementId: string, index: number): string =>
  `${TOOTH_PREFIX}${placementId}:${index}`;

export const isToothBeadId = (id: string): boolean => id.startsWith(TOOTH_PREFIX);

export const parseToothBeadId = (id: string): [string, number] => {
  const [, placementId, indexStr] = id.split(':');
  return [placementId, Number(indexStr)];
};

// Глубина схождения в точку — НЕ отдельная константа: тот же темп 0.5
// колонки за ряд с каждой стороны, что и в taper.ts (getTaperColumnCuts),
// применённый не ко всему полотну, а к ширине одной полосы [startCol,
// endCol]. Ширина в колонках закрывается ровно за столько же рядов, поэтому
// глубина всегда равна ширине — без клэмпов и особых случаев на широких или
// узких зубцах (см. spec.md, «Зубец»).
export const getToothRows = (startCol: number, endCol: number): number => endCol - startCol;

export interface ToothMeshBead {
  x: number;
  y: number;
  kind: 'node' | 'span';
  // Только для узловых бисерин на границе меша (крайняя в своём ряду, i=0
  // или i=count-1) — какую сторону зубца бисерина образует. У бисерины-кончика
  // (rows, единственный узел ряда) обе стороны сразу — она общая точка схода.
  // Внутренние узловые бисерины широких зубцов (0 < i < count-1) поля не
  // получают — цепочка-подвеска цепляется только за границу, см. pendantChain.ts.
  side?: ('left' | 'right')[];
}

// Бисерина ряда 1 (первая от края), касающаяся настоящего узла нижнего
// ряда — внутренняя колонка граничит с ДВУМЯ такими бисеринами (как любой
// внутренний узел сетки граничит с двумя диагоналями), крайняя (startCol/
// endCol) — только с одной.
export interface ToothAnchor {
  col: number;
  beadIndex: number;
}

export interface ToothMesh {
  beads: ToothMeshBead[];
  // Смежность ВНУТРИ меша по плоскому индексу — для заливки (floodFill.ts).
  neighbors: number[][];
  anchors: ToothAnchor[];
}

const addNeighbor = (neighbors: number[][], a: number, b: number) => {
  neighbors[a].push(b);
  neighbors[b].push(a);
};

// Мини-ромбовидный меш, растущий вниз от полосы [startCol, endCol] нижнего
// ряда: ряд k (k=1..rows, rows=getToothRows) занимает колонки
// [startCol+k·0.5 .. endCol−k·0.5] с шагом 1 — тот же профиль сужения, что
// у Taper, поэтому на ряду rows полоса гарантированно сходится ровно в 1
// узел. Каждый узел ряда k соединяется с двумя узлами ряда k−1 (позиции
// ±0.5) — тот же зигзаг, что рисует generator.ts между соседними узловыми
// рядами сетки; для ряда 1 «родители» — настоящие ноды нижнего ряда
// (anchors), не бисерины меша. Между каждой парой родитель-ребёнок —
// internalCount интерполированных SPAN-бисерин (копия generateSpan из
// generator.ts). anchorY/stepX/rowYStep/internalCount переиспользуют
// геометрию основного полотна — считаются один раз в computeToothMeshes.
export const computeToothMesh = (
  startCol: number,
  endCol: number,
  anchorY: number,
  stepX: number,
  rowYStep: number,
  internalCount: number,
): ToothMesh => {
  const rows = getToothRows(startCol, endCol);
  const beads: ToothMeshBead[] = [];
  const neighbors: number[][] = [];
  const anchors: ToothAnchor[] = [];

  const pushBead = (x: number, y: number, kind: 'node' | 'span'): number => {
    beads.push({ x, y, kind });
    neighbors.push([]);
    return beads.length - 1;
  };

  let prevRowIndexByPosKey: Map<number, number> | null = null;

  for (let k = 1; k <= rows; k++) {
    const count = (endCol - startCol + 1) - k;
    const y = anchorY + k * rowYStep;
    const rowIndexByPosKey = new Map<number, number>();

    for (let i = 0; i < count; i++) {
      const pos = startCol + k * 0.5 + i;
      const x = pos * stepX;
      const nodeIndex = pushBead(x, y, 'node');
      rowIndexByPosKey.set(Math.round(pos * 2), nodeIndex);
      const sides: ('left' | 'right')[] = [];
      if (i === 0) sides.push('left');
      if (i === count - 1) sides.push('right');
      if (sides.length > 0) beads[nodeIndex].side = sides;

      for (const parentPos of [pos - 0.5, pos + 0.5]) {
        if (k === 1) {
          // Родитель — настоящая нода нижнего ряда, не бисерина меша.
          const parentX = parentPos * stepX;
          let fromIndex = -1;
          let firstMeshIndex: number | null = null;
          for (let s = 1; s <= internalCount; s++) {
            const t = s / (internalCount + 1);
            const spanIndex = pushBead(
              parentX + t * (x - parentX),
              anchorY + t * (y - anchorY),
              'span',
            );
            if (firstMeshIndex === null) firstMeshIndex = spanIndex;
            if (fromIndex >= 0) addNeighbor(neighbors, fromIndex, spanIndex);
            fromIndex = spanIndex;
          }
          if (fromIndex >= 0) addNeighbor(neighbors, fromIndex, nodeIndex);
          anchors.push({ col: parentPos, beadIndex: firstMeshIndex ?? nodeIndex });
          continue;
        }

        const parentIndex = prevRowIndexByPosKey!.get(Math.round(parentPos * 2));
        if (parentIndex === undefined) continue;
        let fromIndex = parentIndex;
        for (let s = 1; s <= internalCount; s++) {
          const t = s / (internalCount + 1);
          const spanIndex = pushBead(
            beads[parentIndex].x + t * (x - beads[parentIndex].x),
            beads[parentIndex].y + t * (y - beads[parentIndex].y),
            'span',
          );
          addNeighbor(neighbors, fromIndex, spanIndex);
          fromIndex = spanIndex;
        }
        addNeighbor(neighbors, fromIndex, nodeIndex);
      }
    }

    prevRowIndexByPosKey = rowIndexByPosKey;
  }

  return { beads, neighbors, anchors };
};

// Единая точка входа для всех потребителей геометрии зубца (заливка,
// статистика, высота холста, индекс позиций для нитки, рендер) — считает
// stepX/rowYStep/internalCount из главного полотна один раз, а не в каждом
// потребителе по-своему. Зубец без живого якоря (startCol/endCol больше не
// резолвятся в bottomNodes — сетка сузилась) пропускается, как
// validPendantChains у цепочек.
export const computeToothMeshes = (
  teeth: ToothPlacement[],
  bottomNodes: Bead[],
  spacing: number,
  bottomSpan: number,
): Map<string, ToothMesh> => {
  const result = new Map<string, ToothMesh>();
  if (teeth.length === 0) return result;

  const nodeByCol = new Map<number, Bead>();
  bottomNodes.forEach((n) => nodeByCol.set(n.logicalIndex.col, n));

  const { verticalCompression, horizontalStepMultiplier } = BEAD_THEME.gridDefaults;
  const stepX = spacing * horizontalStepMultiplier;
  const internalCount = Math.max(0, bottomSpan - 2);
  const rowYStep = (internalCount + 1) * spacing * verticalCompression;

  for (const tooth of teeth) {
    const start = nodeByCol.get(tooth.startCol);
    const end = nodeByCol.get(tooth.endCol);
    if (!start || !end) continue;
    result.set(
      tooth.placementId,
      computeToothMesh(tooth.startCol, tooth.endCol, start.y, stepX, rowYStep, internalCount),
    );
  }

  return result;
};

// Пересечение диапазонов ВКЛЮЧАЯ касание общей колонкой — общий якорный узел
// на два зубца тоже запрещён (см. spec.md, «Зубец» — решение против
// наложения).
export const toothOverlaps = (
  startCol: number,
  endCol: number,
  existing: ToothPlacement[],
): boolean => existing.some((t) => startCol <= t.endCol && endCol >= t.startCol);
