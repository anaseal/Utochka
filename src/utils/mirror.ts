// Зеркалирование бисерин относительно вертикальной оси.
// NODE — геометрическое зеркало с учётом чётности ряда: чётные ряды не сдвинуты
//   (col c ↔ col width-1-c), нечётные ряды сдвинуты на stepX/2
//   (col c ↔ col width-2-c). У крайнего узла нечётного ряда пары нет → null.
// SPAN — геометрическое зеркало: логическое зеркало давало бы грани, которых
//   нет в графе силянки, поэтому пролёты отражаются по реальной геометрии
//   с обменом сторон left↔right.
// Возвращает null, когда у бисерины нет зеркальной пары внутри сетки.

const NODE_RE = /^node-(\d+)-(\d+)$/;
const TOP_LINK_RE = /^span-edge-top-link-(\d+)-bead-(\d+)$/;
const VERT_EDGE_RE = /^span-edge-(\d+)-(\d+)-(left|right)-bead-(\d+)$/;
const DECOR_RE = /^decor-(\d+)-(\d+)-(\d+)$/;

const flipSide = (side: 'left' | 'right'): 'left' | 'right' =>
  side === 'left' ? 'right' : 'left';

export const mirrorBeadId = (
  id: string,
  width: number,
  internalTop: number,
): string | null => {
  const nodeM = id.match(NODE_RE);
  if (nodeM) {
    const r = Number(nodeM[1]);
    const c = Number(nodeM[2]);
    const isEven = r % 2 === 0;
    const mc = isEven ? width - 1 - c : width - 2 - c;
    if (mc < 0 || mc >= (isEven ? width : width - 1)) return null;
    return `node-${r}-${mc}`;
  }

  const topM = id.match(TOP_LINK_RE);
  if (topM) {
    const c = Number(topM[1]);
    const i = Number(topM[2]);
    const mc = width - 2 - c;
    if (mc < 0) return null;
    const mi = internalTop + 1 - i;
    return `span-edge-top-link-${mc}-bead-${mi}`;
  }

  const vertM = id.match(VERT_EDGE_RE);
  if (vertM) {
    const r = Number(vertM[1]);
    const c = Number(vertM[2]);
    const side = vertM[3] as 'left' | 'right';
    const i = Number(vertM[4]);
    const isEven = r % 2 === 0;
    const mc = isEven ? width - 1 - c : width - 2 - c;
    const ms = flipSide(side);
    if (mc < 0 || mc >= (isEven ? width : width - 1)) return null;
    if (isEven && ms === 'left' && mc === 0) return null;
    return `span-edge-${r}-${mc}-${ms}-bead-${i}`;
  }

  // Декор-полоса повторяет разметку узлового ряда r → логическое зеркало как у NODE.
  const decorM = id.match(DECOR_RE);
  if (decorM) {
    const r = Number(decorM[1]);
    const k = Number(decorM[2]);
    const c = Number(decorM[3]);
    const isEven = r % 2 === 0;
    const mc = isEven ? width - 1 - c : width - 2 - c;
    if (mc < 0 || mc >= (isEven ? width : width - 1)) return null;
    return `decor-${r}-${k}-${mc}`;
  }

  return null;
};
