// Зеркалирование бисерин относительно вертикальной оси.
// NODE — геометрическое зеркало с учётом чётности ряда: чётные ряды не сдвинуты
//   (col c ↔ col width-1-c, c от 0 до width-1), нечётные ряды сдвинуты на
//   stepX/2 и на одну колонку шире с каждой стороны (col c ↔ col width-2-c,
//   c от -1 до width-1) — см. generator.ts.
// SPAN — геометрическое зеркало: логическое зеркало давало бы грани, которых
//   нет в графе силянки, поэтому пролёты отражаются по реальной геометрии
//   с обменом сторон left↔right.
// Возвращает null, когда у бисерины нет зеркальной пары внутри сетки.

import { decode, encode } from './beadId';

const flipSide = (side: 'left' | 'right'): 'left' | 'right' =>
  side === 'left' ? 'right' : 'left';

// Зеркальная колонка по чётности ряда + проверка, что она в диапазоне сетки.
const mirrorCol = (r: number, c: number, width: number): number | null => {
  const isEven = r % 2 === 0;
  const mc = isEven ? width - 1 - c : width - 2 - c;
  const valid = isEven ? mc >= 0 && mc < width : mc >= -1 && mc <= width - 1;
  return valid ? mc : null;
};

export const mirrorBeadId = (
  id: string,
  width: number,
  internalTop: number,
  internalBottom?: number,
): string | null => {
  const ref = decode(id);
  if (!ref) return null;

  switch (ref.kind) {
    case 'node': {
      const mc = mirrorCol(ref.r, ref.c, width);
      if (mc === null) return null;
      return encode({ ...ref, c: mc });
    }

    case 'topLink': {
      const mc = width - 2 - ref.c;
      if (mc < 0) return null;
      const mi = internalTop + 1 - ref.i;
      return encode({ ...ref, c: mc, i: mi });
    }

    case 'bottomLink': {
      if (internalBottom === undefined) return null;
      const mc = width - 2 - ref.c;
      if (mc < 0) return null;
      const mi = internalBottom + 1 - ref.i;
      return encode({ ...ref, c: mc, i: mi });
    }

    case 'vertEdge': {
      const mc = mirrorCol(ref.r, ref.c, width);
      if (mc === null) return null;
      return encode({ ...ref, c: mc, side: flipSide(ref.side) });
    }

    // Декор-полоса повторяет разметку узлового ряда r → логическое зеркало как у NODE.
    case 'decor': {
      const mc = mirrorCol(ref.r, ref.c, width);
      if (mc === null) return null;
      return encode({ ...ref, c: mc });
    }
  }
};
