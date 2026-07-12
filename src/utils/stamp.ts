// Штамп: захват раскрашенного мотива и перенос (translate) в другое место сетки.
// В отличие от mirror.ts (отражение), здесь чистый сдвиг по (dRow, dCol) —
// но т.к. у сетки нет равномерной решётки (чётность рядов, per-row span,
// кромки жёстко привязанные к r=0/r=2*height, декор-полосы с измерением k),
// перенос id не сводится к сложению чисел — нужна геометрия того же рода,
// что и в generator.ts/mirror.ts.

import { Bead } from '../types/bead';
import { resolveSpanCount } from './spans';
import { decode, encode } from './beadId';

export interface StampContext {
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  decorBands: Record<number, number>;
  beadIds: Set<string>;
}

export interface StampPatternEntry {
  id: string;
  color: string;
}

export interface StampPattern {
  anchorRow: number;
  anchorCol: number;
  // Тот же якорь, но от нижнего ряда захваченного выделения — позволяет
  // разместить штамп «низом» (например, к верхнему краю полотна), не наводя
  // мышь за пределы сетки. См. edge-параметр applyStampPattern.
  anchorRowBottom: number;
  anchorColBottom: number;
  entries: StampPatternEntry[];
}

export type StampAnchorEdge = 'top' | 'bottom';

// Та же формула, что и getInternalCount в generator.ts:37-38.
const getInternalCount = (r: number, ctx: StampContext): number =>
  Math.max(0, resolveSpanCount(r, ctx.topSpan, ctx.bottomSpan, ctx.rowSpanOverrides) - 2);

const mod2 = (n: number): number => ((n % 2) + 2) % 2;

// Нечётные ряды физически сдвинуты на stepX/2 относительно чётных
// (generator.ts:61-62). При переносе штампа на нечётное число рядов (dRow
// меняет чётность) этот полшаг накапливается по-разному для бисерин, чья
// исходная чётность ряда совпадает с чётностью ряда-якоря узора, и для тех,
// у кого не совпадает — без компенсации колонка съезжает ровно на 1 шаг у
// каждой второй строки узора, и рисунок рвётся на несвязанные половины.
const colParityCorrection = (r: number, dRow: number, anchorRow: number): number => {
  if (dRow % 2 === 0 || mod2(r) === mod2(anchorRow)) return 0;
  return mod2(anchorRow) === 0 ? 1 : -1;
};

// Переносит id бисерины на (dRow, dCol). anchorRow — ряд якоря узора
// (pattern.anchorRow), нужен только для колоночной коррекции чётности выше.
// Возвращает null, если у бисерины физически нет аналога в целевой позиции —
// финальная проверка всегда идёт через ctx.beadIds (реальный список id
// текущей сетки), формулы дают только кандидата.
export const translateBeadId = (
  id: string,
  dRow: number,
  dCol: number,
  ctx: StampContext,
  anchorRow: number,
): string | null => {
  const accept = (candidate: string): string | null =>
    ctx.beadIds.has(candidate) ? candidate : null;

  const ref = decode(id);
  if (!ref) return null; // pendant:* — отдельная система colorMap, не поддерживается в v1.

  switch (ref.kind) {
    case 'node': {
      const r = ref.r + dRow;
      const c = ref.c + dCol + colParityCorrection(ref.r, dRow, anchorRow);
      return accept(encode({ ...ref, r, c }));
    }

    // Верхняя/нижняя кромка жёстко привязана к r=0 / r=2*height — переносится
    // только по горизонтали. Вертикальный сдвиг штампа роняет эти бисерины.
    case 'topLink':
    case 'bottomLink': {
      if (dRow !== 0) return null;
      const c = ref.c + dCol;
      return accept(encode({ ...ref, c }));
    }

    case 'vertEdge': {
      const c = ref.c + dCol + colParityCorrection(ref.r, dRow, anchorRow);
      const r2 = ref.r + dRow;
      const srcCount = getInternalCount(ref.r, ctx);
      const dstCount = getInternalCount(r2, ctx);
      if (srcCount === 0 || dstCount === 0) return null;
      const t = ref.i / (srcCount + 1);
      const i2 = Math.round(t * (dstCount + 1));
      if (i2 < 1 || i2 > dstCount) return null;
      return accept(encode({ ...ref, r: r2, c, i: i2 }));
    }

    case 'decor': {
      const r = ref.r + dRow;
      const c = ref.c + dCol + colParityCorrection(ref.r, dRow, anchorRow);
      if ((ctx.decorBands[r] ?? 0) < ref.k) return null;
      return accept(encode({ ...ref, r, c }));
    }
  }
};

// anchor = минимальный (row, col) среди захваченных NODE-бисерин; если в
// выделении нет узлов — среди всех logicalIndex захваченных бисерин.
// anchorBottom — та же логика, но от максимального row (нижний край выделения).
export const captureStampPattern = (
  ids: string[],
  beads: Bead[],
  designMap: Record<string, string>,
): StampPattern => {
  const beadMap = new Map(beads.map(b => [b.id, b]));
  const selected = ids
    .map(id => beadMap.get(id))
    .filter((b): b is Bead => b !== undefined);

  const nodeSelected = selected.filter(b => b.type === 'NODE');
  const anchorSource = nodeSelected.length > 0 ? nodeSelected : selected;

  let anchorRow = Infinity;
  for (const b of anchorSource) {
    if (b.logicalIndex.row < anchorRow) anchorRow = b.logicalIndex.row;
  }
  let anchorCol = Infinity;
  for (const b of anchorSource) {
    if (b.logicalIndex.row === anchorRow && b.logicalIndex.col < anchorCol) {
      anchorCol = b.logicalIndex.col;
    }
  }

  let anchorRowBottom = -Infinity;
  for (const b of anchorSource) {
    if (b.logicalIndex.row > anchorRowBottom) anchorRowBottom = b.logicalIndex.row;
  }
  let anchorColBottom = Infinity;
  for (const b of anchorSource) {
    if (b.logicalIndex.row === anchorRowBottom && b.logicalIndex.col < anchorColBottom) {
      anchorColBottom = b.logicalIndex.col;
    }
  }

  // Незакрашенные бисерины в выделении не попадают в узор: штамп переносит
  // только реально нарисованный цвет, не «допечатывает» пустоту поверх
  // того, что уже может быть на месте вставки.
  const entries: StampPatternEntry[] = selected
    .filter(b => designMap[b.id] !== undefined)
    .map(b => ({ id: b.id, color: designMap[b.id] }));

  return {
    anchorRow: anchorRow === Infinity ? 0 : anchorRow,
    anchorCol: anchorCol === Infinity ? 0 : anchorCol,
    anchorRowBottom: anchorRowBottom === -Infinity ? 0 : anchorRowBottom,
    anchorColBottom: anchorColBottom === Infinity ? 0 : anchorColBottom,
    entries,
  };
};

// Считает dRow/dCol от anchor (или anchorBottom, если edge='bottom') до
// targetAnchor, прогоняет каждую запись через translateBeadId. Возвращает
// готовый патч для designMap (id -> color) — бисерины без аналога в целевой
// позиции просто отсутствуют в результате (это и даёт эффект «обрезки»
// штампа краем полотна вместо необходимости заводить курсор за его пределы).
export const applyStampPattern = (
  pattern: StampPattern,
  targetAnchor: { row: number; col: number },
  ctx: StampContext,
  edge: StampAnchorEdge = 'top',
): Record<string, string> => {
  const refRow = edge === 'bottom' ? pattern.anchorRowBottom : pattern.anchorRow;
  const refCol = edge === 'bottom' ? pattern.anchorColBottom : pattern.anchorCol;
  const dRow = targetAnchor.row - refRow;
  const dCol = targetAnchor.col - refCol;

  const result: Record<string, string> = {};
  for (const entry of pattern.entries) {
    const targetId = translateBeadId(entry.id, dRow, dCol, ctx, refRow);
    if (targetId !== null) result[targetId] = entry.color;
  }
  return result;
};
