import { Bead } from '../types/bead';
import { PendantAnchor, ToothPlacement } from '../types/pendant';
import { ToothMesh, toothBeadId, findMirrorTooth } from './tooth';

export interface PendantAnchorPoint {
  id: string;
  x: number;
  y: number;
}

// Единая точка резолва якоря точечной подвески в координаты+id — и для сетки
// (col → pendantAnchorByCol, уже учитывающий подмену на кончик декор-хвоста,
// см. pendantAnchors в useSilyankaProject.ts), и для зубца (placementId +
// beadIndex → конкретная бисерина-граница меша). По образцу resolveChainAnchor
// (utils/pendantChain.ts, форма якоря идентична ChainEndpoint) — используется
// рендером, floodFill, статистикой, высотой холста и индексом позиций нитки.
export const resolvePendantAnchor = (
  anchor: PendantAnchor,
  pendantAnchorByCol: Map<number, Bead>,
  toothMeshes: Map<string, ToothMesh>,
): PendantAnchorPoint | null => {
  if (anchor.kind === 'grid') {
    const node = pendantAnchorByCol.get(anchor.col);
    return node ? { id: node.id, x: node.x, y: node.y } : null;
  }
  const bead = toothMeshes.get(anchor.placementId)?.beads[anchor.beadIndex];
  if (!bead) return null;
  return { id: toothBeadId(anchor.placementId, anchor.beadIndex), x: bead.x, y: bead.y };
};

export const pendantAnchorsEqual = (a: PendantAnchor, b: PendantAnchor): boolean => {
  if (a.kind === 'grid' && b.kind === 'grid') return a.col === b.col;
  if (a.kind === 'tooth' && b.kind === 'tooth') {
    return a.placementId === b.placementId && a.beadIndex === b.beadIndex;
  }
  return false;
};

// Зеркальный якорь для Mirror Mode: сетка отражается по col c ↔ col
// (width-1-c) (нижний ряд чётный, зеркало точное), зубец — через свою
// зеркальную пару в teeth (findMirrorTooth) с тем же beadIndex (меши
// зеркальных зубцов генерируются идентично по структуре — тот же приём, что
// и у mirrorEndpoint в usePendantChains.ts). null, если зеркала нет (зубец
// без пары, либо зеркальная колонка сетки вышла за границу — теоретически
// невозможно для col из [0,width), но защищаемся на случай будущих
// вызывающих с иным диапазоном).
export const mirrorPendantAnchor = (
  anchor: PendantAnchor,
  teeth: ToothPlacement[],
  width: number,
): PendantAnchor | null => {
  if (anchor.kind === 'grid') {
    const col = width - 1 - anchor.col;
    return col >= 0 && col < width ? { kind: 'grid', col } : null;
  }
  const tooth = teeth.find((t) => t.placementId === anchor.placementId);
  if (!tooth) return null;
  const mirrorTooth = findMirrorTooth(tooth, teeth, width);
  return mirrorTooth ? { kind: 'tooth', placementId: mirrorTooth.placementId, beadIndex: anchor.beadIndex } : null;
};
