// Штамп: захват раскрашенного мотива и перенос (translate) в другое место сетки.
// В отличие от mirror.ts (отражение), здесь чистый сдвиг по (dRow, dCol) —
// но т.к. у сетки нет равномерной решётки (чётность рядов, per-row span,
// кромки жёстко привязанные к r=0/r=2*height, декор-полосы с измерением k),
// перенос id не сводится к сложению чисел — нужна геометрия того же рода,
// что и в generator.ts/mirror.ts.

import { Bead } from '../types/bead';
import { resolveSpanCount } from './spans';

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
  entries: StampPatternEntry[];
}

const NODE_RE = /^node-(\d+)-(\d+)$/;
const TOP_LINK_RE = /^span-edge-top-link-(\d+)-bead-(\d+)$/;
const BOTTOM_LINK_RE = /^span-edge-bottom-link-(\d+)-bead-(\d+)$/;
const VERT_EDGE_RE = /^span-edge-(\d+)-(\d+)-(left|right)-bead-(\d+)$/;
const DECOR_RE = /^decor-(\d+)-(\d+)-(\d+)$/;

// Та же формула, что и getInternalCount в generator.ts:37-38.
const getInternalCount = (r: number, ctx: StampContext): number =>
  Math.max(0, resolveSpanCount(r, ctx.topSpan, ctx.bottomSpan, ctx.rowSpanOverrides) - 2);

// Переносит id бисерины на (dRow, dCol). Возвращает null, если у бисерины
// физически нет аналога в целевой позиции — финальная проверка всегда идёт
// через ctx.beadIds (реальный список id текущей сетки), формулы дают только
// кандидата.
export const translateBeadId = (
  id: string,
  dRow: number,
  dCol: number,
  ctx: StampContext,
): string | null => {
  const accept = (candidate: string): string | null =>
    ctx.beadIds.has(candidate) ? candidate : null;

  const nodeM = id.match(NODE_RE);
  if (nodeM) {
    const r = Number(nodeM[1]) + dRow;
    const c = Number(nodeM[2]) + dCol;
    return accept(`node-${r}-${c}`);
  }

  // Верхняя/нижняя кромка жёстко привязана к r=0 / r=2*height — переносится
  // только по горизонтали. Вертикальный сдвиг штампа роняет эти бисерины.
  const topM = id.match(TOP_LINK_RE);
  if (topM) {
    if (dRow !== 0) return null;
    const c = Number(topM[1]) + dCol;
    const i = topM[2];
    return accept(`span-edge-top-link-${c}-bead-${i}`);
  }

  const bottomM = id.match(BOTTOM_LINK_RE);
  if (bottomM) {
    if (dRow !== 0) return null;
    const c = Number(bottomM[1]) + dCol;
    const i = bottomM[2];
    return accept(`span-edge-bottom-link-${c}-bead-${i}`);
  }

  const vertM = id.match(VERT_EDGE_RE);
  if (vertM) {
    const r = Number(vertM[1]);
    const c = Number(vertM[2]) + dCol;
    const side = vertM[3];
    const i = Number(vertM[4]);
    const r2 = r + dRow;
    const srcCount = getInternalCount(r, ctx);
    const dstCount = getInternalCount(r2, ctx);
    if (srcCount === 0 || dstCount === 0) return null;
    const t = i / (srcCount + 1);
    const i2 = Math.round(t * (dstCount + 1));
    if (i2 < 1 || i2 > dstCount) return null;
    return accept(`span-edge-${r2}-${c}-${side}-bead-${i2}`);
  }

  const decorM = id.match(DECOR_RE);
  if (decorM) {
    const r = Number(decorM[1]) + dRow;
    const k = Number(decorM[2]);
    const c = Number(decorM[3]) + dCol;
    if ((ctx.decorBands[r] ?? 0) < k) return null;
    return accept(`decor-${r}-${k}-${c}`);
  }

  // pendant:* — отдельная система colorMap, не поддерживается в v1.
  return null;
};

// anchor = минимальный (row, col) среди захваченных NODE-бисерин; если в
// выделении нет узлов — среди всех logicalIndex захваченных бисерин.
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

  // Незакрашенные бисерины в выделении не попадают в узор: штамп переносит
  // только реально нарисованный цвет, не «допечатывает» пустоту поверх
  // того, что уже может быть на месте вставки.
  const entries: StampPatternEntry[] = selected
    .filter(b => designMap[b.id] !== undefined)
    .map(b => ({ id: b.id, color: designMap[b.id] }));

  return {
    anchorRow: anchorRow === Infinity ? 0 : anchorRow,
    anchorCol: anchorCol === Infinity ? 0 : anchorCol,
    entries,
  };
};

// Считает dRow/dCol от anchor до targetAnchor, прогоняет каждую запись через
// translateBeadId. Возвращает готовый патч для designMap (id -> color) —
// бисерины без аналога в целевой позиции просто отсутствуют в результате.
export const applyStampPattern = (
  pattern: StampPattern,
  targetAnchor: { row: number; col: number },
  ctx: StampContext,
): Record<string, string> => {
  const dRow = targetAnchor.row - pattern.anchorRow;
  const dCol = targetAnchor.col - pattern.anchorCol;

  const result: Record<string, string> = {};
  for (const entry of pattern.entries) {
    const targetId = translateBeadId(entry.id, dRow, dCol, ctx);
    if (targetId !== null) result[targetId] = entry.color;
  }
  return result;
};
