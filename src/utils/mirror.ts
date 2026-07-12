// Зеркалирование бисерин относительно вертикальной оси.
// NODE — геометрическое зеркало с учётом чётности ряда: чётные ряды не сдвинуты
//   (col c ↔ col width-1-c), нечётные ряды сдвинуты на stepX/2
//   (col c ↔ col width-2-c). У крайнего узла нечётного ряда пары нет → null.
// SPAN — геометрическое зеркало: логическое зеркало давало бы грани, которых
//   нет в графе силянки, поэтому пролёты отражаются по реальной геометрии
//   с обменом сторон left↔right.
// Возвращает null, когда у бисерины нет зеркальной пары внутри сетки.

import { decode, encode } from './beadId';

const flipSide = (side: 'left' | 'right'): 'left' | 'right' =>
  side === 'left' ? 'right' : 'left';

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
      const isEven = ref.r % 2 === 0;
      const mc = isEven ? width - 1 - ref.c : width - 2 - ref.c;
      if (mc < 0 || mc >= (isEven ? width : width - 1)) return null;
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
      const isEven = ref.r % 2 === 0;
      const mc = isEven ? width - 1 - ref.c : width - 2 - ref.c;
      const ms = flipSide(ref.side);
      if (mc < 0 || mc >= (isEven ? width : width - 1)) return null;
      if (isEven && ms === 'left' && mc === 0) return null;
      return encode({ ...ref, c: mc, side: ms });
    }

    // Декор-полоса повторяет разметку узлового ряда r → логическое зеркало как у NODE.
    case 'decor': {
      const isEven = ref.r % 2 === 0;
      const mc = isEven ? width - 1 - ref.c : width - 2 - ref.c;
      if (mc < 0 || mc >= (isEven ? width : width - 1)) return null;
      return encode({ ...ref, c: mc });
    }
  }
};
