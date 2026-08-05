// Штамп для Loom: сильно упрощённая версия utils/stamp.ts — один вид
// бисерины (нет node/vertEdge/topLink/decor, id разбирается регуляркой, а не
// через beadId.decode). В отличие от peyoteStamp.ts, здесь не нужна
// полушаговая коррекция колонки при переносе через нечётное число рядов —
// у Loom ряды вообще не сдвинуты (см. loomGenerator.ts), перенос id —
// обычный сдвиг по (dRow, dCol) без поправок. Якорь всегда левый верхний
// угол выделения — у Loom нет структурного различия «низа» и «верха» узора.

const BEAD_RE = /^loom-(\d+)-(\d+)$/;

export interface LoomStampContext {
  width: number;
  height: number;
}

export interface LoomStampPatternEntry {
  id: string;
  color: string;
}

export interface LoomStampPattern {
  anchorRow: number;
  anchorCol: number;
  entries: LoomStampPatternEntry[];
}

// Переносит id бисерины на (dRow, dCol). Возвращает null, если целевая
// позиция физически не существует на сетке — у Loom это просто проверка
// границ [0,width)×[0,height), т.к. сетка прямоугольная и без дыр.
export const translateLoomBeadId = (
  id: string,
  dRow: number,
  dCol: number,
  ctx: LoomStampContext,
): string | null => {
  const m = id.match(BEAD_RE);
  if (!m) return null;
  const r = Number(m[1]) + dRow;
  const c = Number(m[2]) + dCol;
  if (r < 0 || r >= ctx.height || c < 0 || c >= ctx.width) return null;
  return `loom-${r}-${c}`;
};

// anchor = минимальный (row, col) среди захваченных бисерин — у Loom нет
// понятия node/span, якорем служит сама выделенная область целиком.
export const captureLoomStampPattern = (
  ids: string[],
  designMap: Record<string, string>,
): LoomStampPattern => {
  const parsed = ids
    .map(id => {
      const m = id.match(BEAD_RE);
      return m ? { id, r: Number(m[1]), c: Number(m[2]) } : null;
    })
    .filter((p): p is { id: string; r: number; c: number } => p !== null);

  let anchorRow = Infinity;
  for (const p of parsed) {
    if (p.r < anchorRow) anchorRow = p.r;
  }
  let anchorCol = Infinity;
  for (const p of parsed) {
    if (p.r === anchorRow && p.c < anchorCol) anchorCol = p.c;
  }

  // Незакрашенные бисерины в выделении не попадают в узор — штамп переносит
  // только реально нарисованный цвет (см. тот же приём в captureStampPattern).
  const entries: LoomStampPatternEntry[] = parsed
    .filter(p => designMap[p.id] !== undefined)
    .map(p => ({ id: p.id, color: designMap[p.id] }));

  return {
    anchorRow: anchorRow === Infinity ? 0 : anchorRow,
    anchorCol: anchorCol === Infinity ? 0 : anchorCol,
    entries,
  };
};

// Считает dRow/dCol от anchor до targetAnchor, прогоняет каждую запись через
// translateLoomBeadId. Возвращает готовый патч для designMap — бисерины без
// аналога в целевой позиции просто отсутствуют в результате (эффект
// «обрезки» штампа краем полотна).
export const applyLoomStampPattern = (
  pattern: LoomStampPattern,
  targetAnchor: { row: number; col: number },
  ctx: LoomStampContext,
): Record<string, string> => {
  const dRow = targetAnchor.row - pattern.anchorRow;
  const dCol = targetAnchor.col - pattern.anchorCol;

  const result: Record<string, string> = {};
  for (const entry of pattern.entries) {
    const targetId = translateLoomBeadId(entry.id, dRow, dCol, ctx);
    if (targetId !== null) result[targetId] = entry.color;
  }
  return result;
};
