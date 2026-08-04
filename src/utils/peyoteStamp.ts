// Штамп для Peyote: сильно упрощённая версия utils/stamp.ts — один вид
// бисерины (нет node/vertEdge/topLink/decor, id разбирается регуляркой, а не
// через beadId.decode), перенос id — обычный сдвиг по (dRow, dCol) с той же
// полушаговой коррекцией колонки на чётность dRow, что и у силянки
// (colParityCorrection), но без параметра edge (top/bottom) — якорь всегда
// левый верхний угол выделения: у Peyote нет структурного различия «низа» и
// «верха» узора, как node/vertEdge у силянки.

const BEAD_RE = /^peyote-(\d+)-(\d+)$/;

export interface PeyoteStampContext {
  width: number;
  height: number;
}

export interface PeyoteStampPatternEntry {
  id: string;
  color: string;
}

export interface PeyoteStampPattern {
  anchorRow: number;
  anchorCol: number;
  entries: PeyoteStampPatternEntry[];
}

const mod2 = (n: number): number => ((n % 2) + 2) % 2;

// Нечётные ряды физически сдвинуты на pitchX/2 относительно чётных
// (peyoteGenerator.ts). При переносе штампа на нечётное число рядов (dRow
// меняет чётность) этот полшаг накапливается по-разному для бисерин, чья
// исходная чётность ряда совпадает с чётностью ряда-якоря узора, и для тех,
// у кого не совпадает — без компенсации колонка съезжает на 1 у каждой
// второй строки узора, и рисунок рвётся на несвязанные половины (тот же
// эффект, что и colParityCorrection в utils/stamp.ts).
const colParityCorrection = (r: number, dRow: number, anchorRow: number): number => {
  if (dRow % 2 === 0 || mod2(r) === mod2(anchorRow)) return 0;
  return mod2(anchorRow) === 0 ? 1 : -1;
};

// Переносит id бисерины на (dRow, dCol). anchorRow — ряд якоря узора
// (pattern.anchorRow), нужен только для колоночной коррекции чётности выше.
// Возвращает null, если целевая позиция физически не существует на сетке —
// у Peyote это просто проверка границ [0,width)×[0,height), т.к. сетка
// прямоугольная и без дыр (в отличие от силянки — там нужен ctx.beadIds).
export const translatePeyoteBeadId = (
  id: string,
  dRow: number,
  dCol: number,
  anchorRow: number,
  ctx: PeyoteStampContext,
): string | null => {
  const m = id.match(BEAD_RE);
  if (!m) return null;
  const r = Number(m[1]) + dRow;
  const c = Number(m[2]) + dCol + colParityCorrection(Number(m[1]), dRow, anchorRow);
  if (r < 0 || r >= ctx.height || c < 0 || c >= ctx.width) return null;
  return `peyote-${r}-${c}`;
};

// anchor = минимальный (row, col) среди захваченных бисерин — у Peyote нет
// понятия node/span, якорем служит сама выделенная область целиком.
export const capturePeyoteStampPattern = (
  ids: string[],
  designMap: Record<string, string>,
): PeyoteStampPattern => {
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
  const entries: PeyoteStampPatternEntry[] = parsed
    .filter(p => designMap[p.id] !== undefined)
    .map(p => ({ id: p.id, color: designMap[p.id] }));

  return {
    anchorRow: anchorRow === Infinity ? 0 : anchorRow,
    anchorCol: anchorCol === Infinity ? 0 : anchorCol,
    entries,
  };
};

// Считает dRow/dCol от anchor до targetAnchor, прогоняет каждую запись через
// translatePeyoteBeadId. Возвращает готовый патч для designMap — бисерины без
// аналога в целевой позиции просто отсутствуют в результате (эффект
// «обрезки» штампа краем полотна).
export const applyPeyoteStampPattern = (
  pattern: PeyoteStampPattern,
  targetAnchor: { row: number; col: number },
  ctx: PeyoteStampContext,
): Record<string, string> => {
  const dRow = targetAnchor.row - pattern.anchorRow;
  const dCol = targetAnchor.col - pattern.anchorCol;

  const result: Record<string, string> = {};
  for (const entry of pattern.entries) {
    const targetId = translatePeyoteBeadId(entry.id, dRow, dCol, pattern.anchorRow, ctx);
    if (targetId !== null) result[targetId] = entry.color;
  }
  return result;
};
