import { useCallback, useMemo } from 'react';
import { Bead } from '../../types/bead';
import {
  PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement, ToothPlacement, ChainEndpoint,
  PendantAnchor,
} from '../../types/pendant';
import { BEAD_THEME } from '../../config/theme';
import { useBeadCoords } from '../../hooks/useBeadCoords';
import { ToothMesh, isColumnInAnyTooth } from '../../utils/tooth';
import { PendantsCatalogSection } from './PendantsCatalogSection';
import { ChainsSection } from './ChainsSection';
import { DecorSection } from './DecorSection';
import { ToothSection } from './ToothSection';
import { HolesSection } from './HolesSection';
import './Sidebar.css';
import './PendantsSidebar.css';

interface PendantsSidebarProps {
  open: boolean;
  templates: PendantTemplate[];
  placements: PendantPlacement[];
  onHoveredPendantAnchorChange: (anchor: PendantAnchor | null) => void;
  onAddPlacement: (templateId: string, anchor: PendantAnchor) => void;
  onClearAll: () => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  // Группа-носитель координат бисерин — та же, что рисует CanvasView (см.
  // useSilyankaProject.ts), нужна для useBeadCoords ниже: перевод
  // client-координат драга через getScreenCTM этой группы, а не через ручную
  // копию offsetX/offsetY/zoom (та копия расходилась с реальным сдвигом
  // холста, см. toSvgPoint ниже).
  stampGroupRef: React.RefObject<SVGGElement | null>;
  bottomNodes: Bead[];
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
  chainPendingStart: ChainEndpoint | null;
  onRemoveChain: (placementId: string) => void;
  onClearChains: () => void;
  teeth: ToothPlacement[];
  // Геометрия меша каждого зубца — нужна, чтобы драг подвески из каталога мог
  // прицелиться в кончик зубца (см. computePendantAnchor ниже, spec.md,
  // «Зубец»).
  toothMeshes: Map<string, ToothMesh>;
  toothToolActive: boolean;
  onToggleToothTool: () => void;
  toothPendingStart: number | null;
  onRemoveTooth: (placementId: string) => void;
  onClearTeeth: () => void;
  // Дыра (GridSidebar раньше — теперь здесь, среди остальных инструментов
  // редактирования содержимого, а не среди чистой геометрии сетки).
  holeToolActive: boolean;
  onToggleHoleTool: () => void;
  holeSegmentToolActive: boolean;
  onToggleHoleSegmentTool: () => void;
  hasDeletedBeads: boolean;
  onClearDeletedBeads: () => void;
  pendingDeleteCount: number;
  onConfirmPendingDelete: () => void;
}

export const PendantsSidebar = ({
  open,
  templates,
  placements,
  onHoveredPendantAnchorChange,
  onAddPlacement,
  onClearAll,
  canvasSvgRef,
  stampGroupRef,
  bottomNodes,
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
  teeth,
  toothMeshes,
  toothToolActive,
  onToggleToothTool,
  toothPendingStart,
  onRemoveTooth,
  onClearTeeth,
  holeToolActive,
  onToggleHoleTool,
  holeSegmentToolActive,
  onToggleHoleSegmentTool,
  hasDeletedBeads,
  onClearDeletedBeads,
  pendingDeleteCount,
  onConfirmPendingDelete,
}: PendantsSidebarProps) => {
  // Клиентские координаты курсора/пальца → координаты бисерин холста (общий
  // пересчёт для всех compute*-хит-тестов ниже: колонка нижнего ряда, узел
  // зубца, ряд для Decor Bands) — через getScreenCTM группы-носителя
  // координат (см. useBeadCoords), а не ручным вычитанием offsetX/offsetY/
  // zoom: тот расчёт использовал статичный BEAD_THEME.gridDefaults.offsetX,
  // тогда как реальный сдвиг холста динамический (effectiveOffsetX — зависит
  // от того, свёрнуты ли span-контролы, + dim.shiftX для сеток, уходящих
  // левее x=0) — расхождение уводило цель драга на десятки пикселей от
  // видимого узла, особенно заметно на редких узлах меша зубца.
  const toSvgPoint = useBeadCoords(stampGroupRef, canvasSvgRef);

  // Шаг между соседними нодами нижнего ряда — общий масштаб для порогов
  // хит-теста ниже (колонка сетки, узел-граница меша зубца): и то, и другое —
  // бисерины с тем же шагом, что и основная сетка (зубец наследует
  // spacing/stepX от главного полотна, см. computeToothMeshes в tooth.ts).
  const stepX = bottomNodes.length > 1
    ? Math.abs(bottomNodes[1].x - bottomNodes[0].x)
    : BEAD_THEME.gridDefaults.spacing * BEAD_THEME.gridDefaults.horizontalStepMultiplier;

  const computeCol = useCallback((clientX: number, clientY: number): number | null => {
    if (bottomNodes.length === 0) return null;
    const pt = toSvgPoint(clientX, clientY);
    if (!pt) return null;

    const bottomY = bottomNodes[0].y;
    if (pt.y < bottomY - BEAD_THEME.gridDefaults.spacing) return null;

    let best: number | null = null;
    let bestDist = Infinity;
    for (const n of bottomNodes) {
      const d = Math.abs(pt.x - n.x);
      if (d < bestDist) { bestDist = d; best = n.logicalIndex.col; }
    }
    if (bestDist > stepX / 2) return null;
    return best;
  }, [bottomNodes, toSvgPoint, stepX]);

  // Цель драга подвески из каталога: ЛЮБОЙ узел-граница меша зубца (bead.side
  // непустой — тот же критерий, что и у конца цепочки-подвески в
  // ToothLayer.tsx, не только кончик) либо ближайшая нода нижнего ряда,
  // ИСКЛЮЧАЯ колонки, занятые зубцом целиком (см. spec.md, «Зубец» — зубец
  // заменяет эти ноды, точечная подвеска там больше не держится). Декор-хвост
  // (computeCol/computeRow выше) этим ограничением сознательно не связан —
  // решение сузили до точечных подвесок. Порог попадания — половина шага
  // сетки (`stepX`), а не мелкий `hitboxRadius` бисерины: узлы зубца мельче и
  // реже, чем у сплошного ряда, целиться в них по размеру самой бисерины
  // было практически невозможно.
  const computePendantAnchor = useCallback((clientX: number, clientY: number): PendantAnchor | null => {
    const pt = toSvgPoint(clientX, clientY);
    if (!pt) return null;

    let best: { placementId: string; beadIndex: number; dist: number } | null = null;
    for (const t of teeth) {
      const mesh = toothMeshes.get(t.placementId);
      if (!mesh) continue;
      mesh.beads.forEach((bead, beadIndex) => {
        if (!bead.side || bead.side.length === 0) return;
        const dist = Math.hypot(pt.x - bead.x, pt.y - bead.y);
        if (!best || dist < best.dist) best = { placementId: t.placementId, beadIndex, dist };
      });
    }
    if (best && best.dist <= stepX / 2) {
      return { kind: 'tooth', placementId: best.placementId, beadIndex: best.beadIndex };
    }

    const col = computeCol(clientX, clientY);
    if (col === null || isColumnInAnyTooth(col, teeth)) return null;
    return { kind: 'grid', col };
  }, [teeth, toothMeshes, toSvgPoint, computeCol, stepX]);

  const computeRow = useCallback((clientX: number, clientY: number): number | null => {
    if (rowGaps.length === 0) return null;
    const pt = toSvgPoint(clientX, clientY);
    if (!pt) return null;

    let best: { row: number; dist: number } | null = null;
    for (const { row, midY } of rowGaps) {
      const dist = Math.abs(pt.y - midY);
      if (!best || dist < best.dist) best = { row, dist };
    }
    return best && best.dist < 40 ? best.row : null;
  }, [rowGaps, toSvgPoint]);

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
    onClearTeeth();
    onClearDeletedBeads();
  }, [onClearAll, onClearDecor, onClearChains, onClearDecorTails, onClearTeeth, onClearDeletedBeads]);

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
          computeAnchor={computePendantAnchor}
          onHoveredAnchorChange={onHoveredPendantAnchorChange}
          onAddPlacement={onAddPlacement}
          onClearAll={onClearAll}
        />

        <ChainsSection
          pendantChains={pendantChains}
          teeth={teeth}
          chainToolActive={chainToolActive}
          onToggleChainTool={onToggleChainTool}
          chainPendingStart={chainPendingStart}
          onRemoveChain={onRemoveChain}
          onClearChains={onClearChains}
        />

        <ToothSection
          teeth={teeth}
          toothToolActive={toothToolActive}
          onToggleToothTool={onToggleToothTool}
          toothPendingStart={toothPendingStart}
          onRemoveTooth={onRemoveTooth}
          onClearTeeth={onClearTeeth}
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

        <HolesSection
          holeToolActive={holeToolActive}
          onToggleHoleTool={onToggleHoleTool}
          holeSegmentToolActive={holeSegmentToolActive}
          onToggleHoleSegmentTool={onToggleHoleSegmentTool}
          hasDeletedBeads={hasDeletedBeads}
          onClearDeletedBeads={onClearDeletedBeads}
          pendingDeleteCount={pendingDeleteCount}
          onConfirmPendingDelete={onConfirmPendingDelete}
        />
      </div>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__clear"
          onClick={handleClearAll}
          disabled={
            !hasPendants && !hasActiveBands && pendantChains.length === 0 &&
            !hasDecorTails && teeth.length === 0 && !hasDeletedBeads
          }
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
