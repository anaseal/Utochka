// Пересчёт Design Map при изменении ширины в Mirror Mode.
// Сдвигает все закрашенные бисерины на заданное число колонок, чтобы рисунок
// остался по центру относительно новой оси симметрии. Чистая функция.

import { decode, encode } from './beadId';

// Новый ID со сдвигом колонки на shift; null — если бисерина выходит за сетку.
// Декор-полосы regrid не обрабатывает (сдвиг колонок актуален только для
// mirror-resize по ширине, которым декор не пользуется) — decode вернёт
// структуру, но explicit-ветки для неё здесь нет, и она отбрасывается.
const shiftId = (id: string, shift: number, newW: number): string | null => {
  const ref = decode(id);
  if (!ref) return null;

  switch (ref.kind) {
    case 'node':
    case 'vertEdge': {
      const c = ref.c + shift;
      const minC = ref.r % 2 === 0 ? 0 : -1;
      const maxC = newW - 1;
      if (c < minC || c > maxC) return null;
      return encode({ ...ref, c });
    }
    case 'topLink':
    case 'bottomLink': {
      const c = ref.c + shift;
      if (c < 0 || c > newW - 2) return null;
      return encode({ ...ref, c });
    }
    case 'decor':
      return null;
  }
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
