import { useCallback, useMemo } from 'react';
import { Bead } from '../../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement } from '../../types/pendant';
import { BEAD_THEME } from '../../config/theme';
import { PendantsCatalogSection } from './PendantsCatalogSection';
import { ChainsSection } from './ChainsSection';
import { DecorSection } from './DecorSection';
import './Sidebar.css';
import './PendantsSidebar.css';

interface PendantsSidebarProps {
  open: boolean;
  templates: PendantTemplate[];
  placements: PendantPlacement[];
  onHoveredColChange: (col: number | null) => void;
  onAddPlacement: (templateId: string, col: number) => void;
  onClearAll: () => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  bottomNodes: Bead[];
  zoom: number;
  decorBands: Record<number, number>;
  rowGaps: { row: number; midY: number }[];
  onDecorDrop: (nodeRow: number) => void;
  onDecorCount: (nodeRow: number, delta: number) => void;
  onClearDecor: () => void;
  onHoveredRowChange: (row: number | null) => void;
  // Индивидуальный декор-хвост — точечно на одну ноду нижнего ряда (в отличие
  // от Decor Bands выше, полосы на весь ряд). Подвески в свою очередь можно
  // навесить на кончик хвоста той же колонки (см. pendantAnchors в
  // useSilyankaProject.ts, spec.md «Декор-хвост»).
  decorTailPlacements: DecorTailPlacement[];
  onAddDecorTail: (col: number) => void;
  onUpdateDecorTailLength: (placementId: string, delta: number) => void;
  onRemoveDecorTail: (placementId: string) => void;
  onClearDecorTails: () => void;
  onHoveredDecorTailColChange: (col: number | null) => void;
  // Bottom Chain теперь включается/выключается в панели «Сетка» (GridSidebar) —
  // здесь только читаем флаг, чтобы блокировать карточки подвесок (взаимоисключение,
  // см. spec.md, «Взаимоисключение с Bottom Chain»).
  bottomEdgeEnabled: boolean;
  pendantChains: PendantChain[];
  chainToolActive: boolean;
  onToggleChainTool: () => void;
  chainPendingStart: number | null;
  onRemoveChain: (placementId: string) => void;
  onClearChains: () => void;
}

export const PendantsSidebar = ({
  open,
  templates,
  placements,
  onHoveredColChange,
  onAddPlacement,
  onClearAll,
  canvasSvgRef,
  bottomNodes,
  zoom,
  decorBands,
  rowGaps,
  onDecorDrop,
  onDecorCount,
  onClearDecor,
  onHoveredRowChange,
  decorTailPlacements,
  onAddDecorTail,
  onUpdateDecorTailLength,
  onRemoveDecorTail,
  onClearDecorTails,
  onHoveredDecorTailColChange,
  bottomEdgeEnabled,
  pendantChains,
  chainToolActive,
  onToggleChainTool,
  chainPendingStart,
  onRemoveChain,
  onClearChains,
}: PendantsSidebarProps) => {
  const computeCol = useCallback((clientX: number, clientY: number): number | null => {
    const svg = canvasSvgRef.current;
    if (!svg || bottomNodes.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
    const px = (clientX - rect.left) / zoom - offsetX;
    const py = (clientY - rect.top) / zoom - offsetY;

    const bottomY = bottomNodes[0].y;
    if (py < bottomY - BEAD_THEME.gridDefaults.spacing) return null;

    const stepX = bottomNodes.length > 1
      ? Math.abs(bottomNodes[1].x - bottomNodes[0].x)
      : BEAD_THEME.gridDefaults.spacing * BEAD_THEME.gridDefaults.horizontalStepMultiplier;

    let best: number | null = null;
    let bestDist = Infinity;
    for (const n of bottomNodes) {
      const d = Math.abs(px - n.x);
      if (d < bestDist) { bestDist = d; best = n.logicalIndex.col; }
    }
    if (bestDist > stepX / 2) return null;
    return best;
  }, [canvasSvgRef, bottomNodes, zoom]);

  const computeRow = useCallback((clientY: number): number | null => {
    const svg = canvasSvgRef.current;
    if (!svg || rowGaps.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const { offsetY } = BEAD_THEME.gridDefaults;
    const svgY = (clientY - rect.top) / zoom - offsetY;

    let best: { row: number; dist: number } | null = null;
    for (const { row, midY } of rowGaps) {
      const dist = Math.abs(svgY - midY);
      if (!best || dist < best.dist) best = { row, dist };
    }
    return best && best.dist < 40 ? best.row : null;
  }, [canvasSvgRef, rowGaps, zoom]);

  const hasPendants = placements.length > 0;
  const hasDecorTails = decorTailPlacements.length > 0;
  const hasActiveBands = useMemo(
    () => rowGaps.some((g) => (decorBands[g.row] ?? 0) > 0),
    [rowGaps, decorBands],
  );

  const handleClearAll = useCallback(() => {
    onClearAll();
    onClearDecor();
    onClearChains();
    onClearDecorTails();
  }, [onClearAll, onClearDecor, onClearChains, onClearDecorTails]);

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <h2 className="sidebar__title">Pendants &amp; Decor</h2>
      </div>

      <div className="sidebar__body">
        <PendantsCatalogSection
          templates={templates}
          placements={placements}
          bottomEdgeEnabled={bottomEdgeEnabled}
          computeCol={computeCol}
          onHoveredColChange={onHoveredColChange}
          onAddPlacement={onAddPlacement}
          onClearAll={onClearAll}
        />

        <ChainsSection
          pendantChains={pendantChains}
          chainToolActive={chainToolActive}
          onToggleChainTool={onToggleChainTool}
          chainPendingStart={chainPendingStart}
          onRemoveChain={onRemoveChain}
          onClearChains={onClearChains}
        />

        <DecorSection
          bottomEdgeEnabled={bottomEdgeEnabled}
          decorBands={decorBands}
          rowGaps={rowGaps}
          computeRow={computeRow}
          onHoveredRowChange={onHoveredRowChange}
          onDecorDrop={onDecorDrop}
          onDecorCount={onDecorCount}
          onClearDecor={onClearDecor}
          decorTailPlacements={decorTailPlacements}
          computeCol={computeCol}
          onHoveredDecorTailColChange={onHoveredDecorTailColChange}
          onAddDecorTail={onAddDecorTail}
          onUpdateDecorTailLength={onUpdateDecorTailLength}
          onRemoveDecorTail={onRemoveDecorTail}
          onClearDecorTails={onClearDecorTails}
        />
      </div>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__clear"
          onClick={handleClearAll}
          disabled={!hasPendants && !hasActiveBands && pendantChains.length === 0 && !hasDecorTails}
        >
          Reset all
        </button>
        <p className="sidebar__hint">
          {bottomEdgeEnabled
            ? 'Drag a band onto a row gap (pendants and tails unavailable while Bottom Chain is on)'
            : 'Drag a pendant or a tail onto a bottom-row node, or a band onto a row gap'}
        </p>
      </div>
    </aside>
  );
};
