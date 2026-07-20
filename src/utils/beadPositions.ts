import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain } from '../types/pendant';
import { PENDANT_SCALE } from '../data/pendantTemplates';
import { pendantBeadId } from './floodFill';
import { chainBeadId, computeChainBeadPositions } from './pendantChain';

export interface ThreadAnchor {
  x: number;
  y: number;
}

// Единая карта id → координаты по ВСЕМ визуальным слоям силянки (сетка,
// бусины подвесок, бисерины цепочек-подвесок) — нитка магнитится к любой
// бусине на холсте независимо от того, к какому слою та относится
// (см. spec.md, «Нитка»). Каждый слой уже считает свои позиции для рендера
// (PendantLayer/PendantChainLayer) — здесь та же арифметика переиспользуется
// для резолва точек трассировки.
export const buildBeadPositionIndex = (
  beads: Bead[],
  pendantPlacements: PendantPlacement[],
  pendantTemplates: Record<string, PendantTemplate>,
  bottomNodes: Bead[],
  pendantChains: PendantChain[],
): Map<string, ThreadAnchor> => {
  const index = new Map<string, ThreadAnchor>();
  for (const bead of beads) index.set(bead.id, { x: bead.x, y: bead.y });

  const nodeByCol = new Map<number, Bead>();
  bottomNodes.forEach(n => nodeByCol.set(n.logicalIndex.col, n));

  for (const placement of pendantPlacements) {
    const template = pendantTemplates[placement.templateId];
    const anchor = nodeByCol.get(placement.col);
    if (!template || !anchor) continue;
    template.beads.forEach((bead, i) => {
      index.set(pendantBeadId(placement.placementId, i), {
        x: anchor.x + bead.dx * PENDANT_SCALE,
        y: anchor.y + bead.dy * PENDANT_SCALE,
      });
    });
  }

  for (const chain of pendantChains) {
    const start = nodeByCol.get(chain.startCol);
    const end = nodeByCol.get(chain.endCol);
    if (!start || !end) continue;
    computeChainBeadPositions(start, end).forEach((pos, i) => {
      index.set(chainBeadId(chain.placementId, i), pos);
    });
  }

  return index;
};
