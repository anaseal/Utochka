// Пересчёт Design Map при изменении ширины в Mirror Mode.
// Сдвигает все закрашенные бисерины на заданное число колонок, чтобы рисунок
// остался по центру относительно новой оси симметрии. Чистая функция.

import { decode, encode } from './beadId';
import { getColumnRange } from './columnRange';

// Новый ID со сдвигом колонки на shift; null — если бисерина выходит за сетку.
// Декор-полосы regrid не обрабатывает (сдвиг колонок актуален только для
// mirror-resize по ширине, которым декор не пользуется) — decode вернёт
// структуру, но explicit-ветки для неё здесь нет, и она отбрасывается.
// Сужение концов (Taper) здесь не учитывается — оно применяется позиционным
// срезом в generator.ts, а обрезанные бусины отсеются проверкой существования.
const shiftId = (
  id: string,
  shift: number,
  newW: number,
  extendLeft: boolean,
  extendRight: boolean,
): string | null => {
  const ref = decode(id);
  if (!ref) return null;

  switch (ref.kind) {
    case 'node':
    case 'vertEdge': {
      const c = ref.c + shift;
      const { minC, maxC } = getColumnRange(ref.r, newW, extendLeft, extendRight);
      if (c < minC || c > maxC) return null;
      return encode({ ...ref, c });
    }
    case 'topLink':
    case 'bottomLink': {
      // Обе кромки лежат на чётных рядах (r=0 и r=2·height) — одинаковый
      // диапазон колонок; кромка на 1 колонку у́же узлов (c=0..width-2).
      const c = ref.c + shift;
      const { minC, maxC } = getColumnRange(0, newW, extendLeft, extendRight);
      if (c < minC || c > maxC - 1) return null;
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
  extendLeft: boolean = true,
  extendRight: boolean = true,
): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const id of Object.keys(designMap)) {
    const moved = shiftId(id, shift, newW, extendLeft, extendRight);
    if (moved !== null) next[moved] = designMap[id];
  }
  return next;
};
