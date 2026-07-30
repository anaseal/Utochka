/* FILE: src\utils\pendantCanvasDim.ts */
import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement, ToothPlacement } from '../types/pendant';
import { PENDANT_SCALE } from '../data/pendantTemplates';
import { computeChainBeadPositions, resolveChainAnchor } from './pendantChain';
import { ToothMesh } from './tooth';

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
  // Якорь ЦЕПОЧКИ — настоящая нода нижнего ряда (независимо от декор-хвоста
  // на той же колонке, см. spec.md, «Декор-хвост») либо узел зубца
  // (resolveChainAnchor, см. ChainEndpoint в types/pendant.ts).
  bottomNodes: Bead[],
  decorTailPlacements: DecorTailPlacement[],
  decorRowStep: number,
  teeth: ToothPlacement[],
  toothMeshes: Map<string, ToothMesh>,
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
  const bottomNodeByCol = new Map(bottomNodes.map(n => [n.logicalIndex.col, n]));
  for (const c of pendantChains) {
    const start = resolveChainAnchor(c.start, bottomNodeByCol, toothMeshes);
    const end = resolveChainAnchor(c.end, bottomNodeByCol, toothMeshes);
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

  // Зубцы — мини-меш, сходящийся в точку; глубина зависит от ширины каждого
  // конкретного зубца (см. getToothRows в tooth.ts), поэтому берём max по y
  // готового меша, а не по формуле.
  let toothMaxY = 0;
  for (const tooth of teeth) {
    const mesh = toothMeshes.get(tooth.placementId);
    if (!mesh || mesh.beads.length === 0) continue;
    const maxY = Math.max(...mesh.beads.map(b => b.y));
    toothMaxY = Math.max(toothMaxY, maxY + 26);
  }

  return Math.max(pendantMaxY, chainMaxY, decorTailMaxY, toothMaxY);
};
