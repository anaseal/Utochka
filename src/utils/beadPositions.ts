import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement } from '../types/pendant';
import { PENDANT_SCALE } from '../data/pendantTemplates';
import { pendantBeadId } from './floodFill';
import { chainBeadId, computeChainBeadPositions } from './pendantChain';
import { decorTailBeadId, computeDecorTailBeadPositions } from './decorTail';

export interface ThreadAnchor {
  x: number;
  y: number;
}

// Единая карта id → координаты по ВСЕМ визуальным слоям силянки (сетка,
// бусины подвесок, бисерины цепочек-подвесок, бисерины декор-хвостов) —
// нитка магнитится к любой бусине на холсте независимо от того, к какому
// слою та относится (см. spec.md, «Нитка»). Каждый слой уже считает свои
// позиции для рендера (PendantLayer/PendantChainLayer/DecorTailLayer) —
// здесь та же арифметика переиспользуется для резолва точек трассировки.
export const buildBeadPositionIndex = (
  beads: Bead[],
  pendantPlacements: PendantPlacement[],
  pendantTemplates: Record<string, PendantTemplate>,
  // Якорь ПОДВЕСКИ на колонку — настоящая нода либо кончик декор-хвоста той
  // же колонки (см. pendantAnchors в useSilyankaProject.ts).
  pendantAnchorNodes: Bead[],
  pendantChains: PendantChain[],
  // Настоящие ноды нижнего ряда — якорь цепочек и декор-хвостов.
  bottomNodes: Bead[],
  decorTailPlacements: DecorTailPlacement[],
  decorRowStep: number,
): Map<string, ThreadAnchor> => {
  const index = new Map<string, ThreadAnchor>();
  for (const bead of beads) index.set(bead.id, { x: bead.x, y: bead.y });

  const pendantAnchorByCol = new Map<number, Bead>();
  pendantAnchorNodes.forEach(n => pendantAnchorByCol.set(n.logicalIndex.col, n));
  const bottomNodeByCol = new Map<number, Bead>();
  bottomNodes.forEach(n => bottomNodeByCol.set(n.logicalIndex.col, n));

  for (const placement of pendantPlacements) {
    const template = pendantTemplates[placement.templateId];
    const anchor = pendantAnchorByCol.get(placement.col);
    if (!template || !anchor) continue;
    template.beads.forEach((bead, i) => {
      index.set(pendantBeadId(placement.placementId, i), {
        x: anchor.x + bead.dx * PENDANT_SCALE,
        y: anchor.y + bead.dy * PENDANT_SCALE,
      });
    });
  }

  for (const chain of pendantChains) {
    const start = bottomNodeByCol.get(chain.startCol);
    const end = bottomNodeByCol.get(chain.endCol);
    if (!start || !end) continue;
    computeChainBeadPositions(start, end).forEach((pos, i) => {
      index.set(chainBeadId(chain.placementId, i), pos);
    });
  }

  for (const tail of decorTailPlacements) {
    const anchor = bottomNodeByCol.get(tail.col);
    if (!anchor) continue;
    computeDecorTailBeadPositions(anchor, tail.rows, decorRowStep).forEach((pos, i) => {
      index.set(decorTailBeadId(tail.placementId, i), pos);
    });
  }

  return index;
};
