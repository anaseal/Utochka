// Зеркалирование и сдвиг бисерин Loom относительно вертикальной оси. Формула
// одна для всех рядов — как у peyoteMirror.ts, только тут это ещё проще: у
// Loom нет даже сдвига по X между рядами, о котором нужно было бы думать
// (см. loomGenerator.ts), просто прямая матрица.

const BEAD_RE = /^loom-(\d+)-(\d+)$/;

// Возвращает null, когда id не распознан или у бисерины нет зеркальной пары
// внутри сетки (в норме не случается — формула является инволюцией для
// валидных c).
export const mirrorLoomBeadId = (id: string, width: number): string | null => {
  const m = id.match(BEAD_RE);
  if (!m) return null;
  const r = Number(m[1]);
  const c = Number(m[2]);
  const mc = width - 1 - c;
  if (mc < 0 || mc >= width) return null;
  return `loom-${r}-${mc}`;
};

// Сдвиг всех колонок design map на shift (Mirror Mode: ±1 при изменении ширины на ±2).
export const shiftLoomDesignMapColumns = (
  designMap: Record<string, string>,
  shift: number,
  newWidth: number,
): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const id of Object.keys(designMap)) {
    const m = id.match(BEAD_RE);
    if (!m) continue;
    const r = Number(m[1]);
    const c = Number(m[2]) + shift;
    if (c < 0 || c >= newWidth) continue;
    next[`loom-${r}-${c}`] = designMap[id];
  }
  return next;
};
