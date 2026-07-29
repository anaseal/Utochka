/* FILE: src\utils\pendantCanvasDim.ts */
import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement } from '../types/pendant';
import { PENDANT_SCALE } from '../data/pendantTemplates';
import { computeChainBeadPositions } from './pendantChain';

// Подвески, цепочки-подвески и декор-хвосты свисают ниже сетки — считает,
// насколько именно нужно расширить высоту SVG-холста (extraMaxY для
// computeCanvasDim), проверяя все три слоя разом.
export const computeSilyankaExtraMaxY = (
  pendantPlacements: PendantPlacement[],
  pendantTemplates: Record<string, PendantTemplate>,
  // Якорь ПОДВЕСКИ на колонку: bottomNodes либо (для колонок с декор-хвостом)
  // кончик хвоста — см. pendantAnchors в useSilyankaProject.ts.
  pendantAnchors: Bead[],
  pendantChains: PendantChain[],
  // Цепочки крепятся к настоящей ноде независимо от декор-хвоста на той же
  // колонке (см. spec.md, «Декор-хвост»), поэтому якорь для них — bottomNodes.
  bottomNodes: Bead[],
  decorTailPlacements: DecorTailPlacement[],
  decorRowStep: number,
): number => {
  let pendantMaxY = 0;
  for (const p of pendantPlacements) {
    const t = pendantTemplates[p.templateId];
    const anchor = pendantAnchors.find(n => n.logicalIndex.col === p.col);
    if (!t || !anchor) continue;
    let depth = -Infinity;
    for (const b of t.beads) {
      const reach = b.dy + (b.shape === 'circle' ? (b.r ?? 0) : (b.h ?? 0) / 2);
      if (reach > depth) depth = reach;
    }
    // +26: место под кнопку удаления ниже последней бусины
    pendantMaxY = Math.max(pendantMaxY, anchor.y + depth * PENDANT_SCALE + 26);
  }

  let chainMaxY = 0;
  for (const c of pendantChains) {
    const start = bottomNodes.find(n => n.logicalIndex.col === c.startCol);
    const end = bottomNodes.find(n => n.logicalIndex.col === c.endCol);
    if (!start || !end) continue;
    const positions = computeChainBeadPositions(start, end);
    const maxY = Math.max(start.y, end.y, ...positions.map(p => p.y));
    chainMaxY = Math.max(chainMaxY, maxY + 26);
  }

  // Декор-хвосты — прямая колонка вниз от настоящей ноды.
  let decorTailMaxY = 0;
  for (const t of decorTailPlacements) {
    const anchor = bottomNodes.find(n => n.logicalIndex.col === t.col);
    if (!anchor) continue;
    decorTailMaxY = Math.max(decorTailMaxY, anchor.y + t.rows * decorRowStep + 26);
  }

  return Math.max(pendantMaxY, chainMaxY, decorTailMaxY);
};
