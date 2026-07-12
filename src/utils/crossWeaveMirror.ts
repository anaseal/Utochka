// Зеркалирование и сдвиг бисерин CrossWeave относительно вертикальной оси.
// В отличие от силянки здесь один тип бисерины (bead-r-c), поэтому формула
// проще: чётный ряд — вертикальная ориентация, сдвинута на pitchX/2 и на
// одну бусину короче горизонтального (rawWidth-1 против rawWidth у нечётных).

const BEAD_RE = /^bead-(\d+)-(\d+)$/;

const rowMaxC = (r: number, rawWidth: number): number => (
  r % 2 === 0 ? rawWidth - 2 : rawWidth - 1
);

// Возвращает null, когда у бисерины нет зеркальной пары внутри сетки
// (в норме не случается — формула является инволюцией для валидных c).
export const mirrorCrossWeaveBeadId = (id: string, rawWidth: number): string | null => {
  const m = id.match(BEAD_RE);
  if (!m) return null;
  const r = Number(m[1]);
  const c = Number(m[2]);
  const mc = rowMaxC(r, rawWidth) - c;
  if (mc < 0 || mc > rowMaxC(r, rawWidth)) return null;
  return `bead-${r}-${mc}`;
};

// Сдвиг всех колонок design map на shift (Mirror Mode: ±1 при изменении ширины на ±2).
export const shiftCrossWeaveDesignMapColumns = (
  designMap: Record<string, string>,
  shift: number,
  newRawWidth: number,
): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const id of Object.keys(designMap)) {
    const m = id.match(BEAD_RE);
    if (!m) continue;
    const r = Number(m[1]);
    const c = Number(m[2]) + shift;
    if (c < 0 || c > rowMaxC(r, newRawWidth)) continue;
    next[`bead-${r}-${c}`] = designMap[id];
  }
  return next;
};
