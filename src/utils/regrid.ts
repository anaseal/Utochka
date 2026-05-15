// Пересчёт Design Map при изменении ширины в Mirror Mode.
// Сдвигает все закрашенные бисерины на заданное число колонок, чтобы рисунок
// остался по центру относительно новой оси симметрии. Чистая функция.

const NODE_RE = /^node-(\d+)-(\d+)$/;
const TOP_LINK_RE = /^span-edge-top-link-(\d+)-bead-(\d+)$/;
const VERT_EDGE_RE = /^span-edge-(\d+)-(\d+)-(left|right)-bead-(\d+)$/;

// Новый ID со сдвигом колонки на shift; null — если бисерина выходит за сетку.
const shiftId = (id: string, shift: number, newW: number): string | null => {
  const n = id.match(NODE_RE);
  if (n) {
    const r = Number(n[1]);
    const c = Number(n[2]) + shift;
    const maxC = r % 2 === 0 ? newW - 1 : newW - 2;
    if (c < 0 || c > maxC) return null;
    return `node-${r}-${c}`;
  }

  const t = id.match(TOP_LINK_RE);
  if (t) {
    const c = Number(t[1]) + shift;
    const i = Number(t[2]);
    if (c < 0 || c > newW - 2) return null;
    return `span-edge-top-link-${c}-bead-${i}`;
  }

  const v = id.match(VERT_EDGE_RE);
  if (v) {
    const r = Number(v[1]);
    const c = Number(v[2]) + shift;
    const side = v[3] as 'left' | 'right';
    const i = Number(v[4]);
    const maxC = r % 2 === 0 ? newW - 1 : newW - 2;
    if (c < 0 || c > maxC) return null;
    if (r % 2 === 0 && side === 'left' && c < 1) return null;
    return `span-edge-${r}-${c}-${side}-bead-${i}`;
  }

  return null;
};

// Сдвиг всех колонок design map на shift (Mirror Mode: ±1 при изменении ширины на ±2).
export const shiftDesignMapColumns = (
  designMap: Record<string, string>,
  shift: number,
  newW: number,
): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const id of Object.keys(designMap)) {
    const moved = shiftId(id, shift, newW);
    if (moved !== null) next[moved] = designMap[id];
  }
  return next;
};
