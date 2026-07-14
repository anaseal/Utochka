// Единственное место, знающее формат строковых ID сеточных бисерин силянки.
// Пять видов, различаемых по префиксу: node / vertEdge (левая-правая грань
// ромба) / topLink (верхняя кромка, r=0) / bottomLink (нижняя кромка) /
// decor (промежуточная декор-полоса). Строится в generator.ts, разбирается
// здесь — потребители (mirror/stamp/regrid/floodFill) работают со структурой,
// а не с regex. pendant:* — отдельное пространство ID, сюда не входит.

export type BeadRef =
  | { kind: 'node'; r: number; c: number }
  | { kind: 'vertEdge'; r: number; c: number; side: 'left' | 'right'; i: number }
  | { kind: 'topLink'; c: number; i: number }
  | { kind: 'bottomLink'; c: number; i: number }
  | { kind: 'decor'; r: number; k: number; c: number };

const NODE_RE = /^node-(-?\d+)-(-?\d+)$/;
const TOP_LINK_RE = /^span-edge-top-link-(\d+)-bead-(\d+)$/;
const BOTTOM_LINK_RE = /^span-edge-bottom-link-(\d+)-bead-(\d+)$/;
const VERT_EDGE_RE = /^span-edge-(-?\d+)-(-?\d+)-(left|right)-bead-(\d+)$/;
const DECOR_RE = /^decor-(\d+)-(\d+)-(-?\d+)$/;

export const decode = (id: string): BeadRef | null => {
  const nodeM = id.match(NODE_RE);
  if (nodeM) return { kind: 'node', r: Number(nodeM[1]), c: Number(nodeM[2]) };

  const topM = id.match(TOP_LINK_RE);
  if (topM) return { kind: 'topLink', c: Number(topM[1]), i: Number(topM[2]) };

  const bottomM = id.match(BOTTOM_LINK_RE);
  if (bottomM) return { kind: 'bottomLink', c: Number(bottomM[1]), i: Number(bottomM[2]) };

  const vertM = id.match(VERT_EDGE_RE);
  if (vertM) {
    return {
      kind: 'vertEdge',
      r: Number(vertM[1]),
      c: Number(vertM[2]),
      side: vertM[3] as 'left' | 'right',
      i: Number(vertM[4]),
    };
  }

  const decorM = id.match(DECOR_RE);
  if (decorM) return { kind: 'decor', r: Number(decorM[1]), k: Number(decorM[2]), c: Number(decorM[3]) };

  return null;
};

export const encode = (ref: BeadRef): string => {
  switch (ref.kind) {
    case 'node':
      return `node-${ref.r}-${ref.c}`;
    case 'vertEdge':
      return `span-edge-${ref.r}-${ref.c}-${ref.side}-bead-${ref.i}`;
    case 'topLink':
      return `span-edge-top-link-${ref.c}-bead-${ref.i}`;
    case 'bottomLink':
      return `span-edge-bottom-link-${ref.c}-bead-${ref.i}`;
    case 'decor':
      return `decor-${ref.r}-${ref.k}-${ref.c}`;
    default: {
      const exhaustive: never = ref;
      return exhaustive;
    }
  }
};
