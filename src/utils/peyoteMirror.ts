// Зеркалирование и сдвиг бисерин Peyote относительно вертикальной оси. В
// отличие от crossWeaveMirror.ts, формула одна для всех рядов: у Peyote все
// ряды одной ширины (width) — зубчатый край даёт сдвиг по X (см.
// peyoteGenerator.ts), а не разная длина ряда, поэтому не нужен аналог
// rowMaxC.

const BEAD_RE = /^peyote-(\d+)-(\d+)$/;

// Возвращает null, когда id не распознан или у бисерины нет зеркальной пары
// внутри сетки (в норме не случается — формула является инволюцией для
// валидных c).
export const mirrorPeyoteBeadId = (id: string, width: number): string | null => {
  const m = id.match(BEAD_RE);
  if (!m) return null;
  const r = Number(m[1]);
  const c = Number(m[2]);
  const mc = width - 1 - c;
  if (mc < 0 || mc >= width) return null;
  return `peyote-${r}-${mc}`;
};

// Сдвиг всех колонок design map на shift (Mirror Mode: ±1 при изменении ширины на ±2).
export const shiftPeyoteDesignMapColumns = (
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
    next[`peyote-${r}-${c}`] = designMap[id];
  }
  return next;
};
