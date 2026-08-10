/* FILE: src\hooks\usePendantStats.ts */
import { useCallback, useMemo } from 'react';
import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement, ToothPlacement } from '../types/pendant';
import { defaultColorFor, effectiveBeadColor } from '../config/theme';
import { chainBeadCountBetween, resolveChainAnchor } from '../utils/pendantChain';
import { ToothMesh } from '../utils/tooth';

interface UsePendantStatsOptions {
  beads: Bead[];
  pendantPlacements: PendantPlacement[];
  pendantTemplates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  pendantChains: PendantChain[];
  decorTailPlacements: DecorTailPlacement[];
  teeth: ToothPlacement[];
  toothMeshes: Map<string, ToothMesh>;
}

// Подвески, цепочки-подвески и декор-хвосты — тоже бисерины проекта, но
// живут вне основной сетки: эта сводка фильтрует их до валидных (с живым
// якорем на нижнем ряду) и досеивает в CanvasStats поверх прохода по сетке.
export const usePendantStats = ({
  beads,
  pendantPlacements,
  pendantTemplates,
  bottomNodes,
  pendantChains,
  decorTailPlacements,
  teeth,
  toothMeshes,
}: UsePendantStatsOptions) => {
  // Подвеска учитывается в статистике, только если у неё есть и валидный
  // шаблон, и живой якорь — нода нижнего ряда (та же проверка, что и в
  // PendantLayer для occupiedCols) либо конкретная бисерина-граница меша
  // зубца (не просто «зубец существует» — сама бисерина тоже должна
  // резолвиться, см. resolvePendantAnchor).
  const validPendantPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return pendantPlacements.filter((p) => pendantTemplates[p.templateId] && (
      p.anchor.kind === 'grid'
        ? bottomCols.has(p.anchor.col)
        : !!toothMeshes.get(p.anchor.placementId)?.beads[p.anchor.beadIndex]
    ));
  }, [pendantPlacements, pendantTemplates, bottomNodes, toothMeshes]);

  // Цепочка учитывается в статистике, только если у неё живы оба конца —
  // узел нижнего ряда либо узел зубца (см. ChainEndpoint, types/pendant.ts;
  // та же проверка, что и у validPendantPlacements).
  const validPendantChains = useMemo(() => {
    const nodeByCol = new Map(bottomNodes.map(n => [n.logicalIndex.col, n]));
    return pendantChains
      .map((c) => {
        const start = resolveChainAnchor(c.start, nodeByCol, toothMeshes);
        const end = resolveChainAnchor(c.end, nodeByCol, toothMeshes);
        if (!start || !end) return null;
        return { chain: c, count: chainBeadCountBetween(start, end) };
      })
      .filter((v): v is { chain: PendantChain; count: number } => v !== null);
  }, [pendantChains, bottomNodes, toothMeshes]);

  // Хвост учитывается в статистике, только если у него жива нода-якорь на
  // нижнем ряду (та же проверка, что и у validPendantPlacements).
  const validDecorTailPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return decorTailPlacements.filter((t) => bottomCols.has(t.col));
  }, [decorTailPlacements, bottomNodes]);

  // Зубец учитывается в статистике, только если у него есть готовый меш
  // (оба конца полосы резолвятся в bottomNodes — см. computeToothMeshes).
  const validTeeth = useMemo(
    () => teeth
      .map((t) => {
        const mesh = toothMeshes.get(t.placementId);
        return mesh ? { tooth: t, mesh } : null;
      })
      .filter((v): v is { tooth: ToothPlacement; mesh: ToothMesh } => v !== null),
    [teeth, toothMeshes],
  );

  const extendStats = useCallback((stats: Map<string, number>) => {
    validPendantPlacements.forEach((p) => {
      const template = pendantTemplates[p.templateId];
      template.beads.forEach((bead, index) => {
        const color = effectiveBeadColor(p.colorMap[index], defaultColorFor(bead.type));
        stats.set(color, (stats.get(color) || 0) + 1);
      });
    });
    validPendantChains.forEach(({ chain, count }) => {
      for (let i = 0; i < count; i++) {
        const color = effectiveBeadColor(chain.colorMap[i], defaultColorFor('SPAN'));
        stats.set(color, (stats.get(color) || 0) + 1);
      }
    });
    validDecorTailPlacements.forEach((t) => {
      for (let i = 0; i < t.rows; i++) {
        const color = effectiveBeadColor(t.colorMap[i], defaultColorFor('SPAN'));
        stats.set(color, (stats.get(color) || 0) + 1);
      }
    });
    validTeeth.forEach(({ tooth, mesh }) => {
      mesh.beads.forEach((bead, i) => {
        const color = effectiveBeadColor(tooth.colorMap[i], defaultColorFor(bead.kind === 'node' ? 'NODE' : 'SPAN'));
        stats.set(color, (stats.get(color) || 0) + 1);
      });
    });
  }, [validPendantPlacements, pendantTemplates, validPendantChains, validDecorTailPlacements, validTeeth]);

  const totalCount = useMemo(() => {
    const pendantBeadCount = validPendantPlacements.reduce(
      (sum, p) => sum + pendantTemplates[p.templateId].beads.length,
      0,
    );
    const chainBeadCount = validPendantChains.reduce((sum, { count }) => sum + count, 0);
    const decorTailBeadCount = validDecorTailPlacements.reduce((sum, t) => sum + t.rows, 0);
    const toothBeadCount = validTeeth.reduce((sum, { mesh }) => sum + mesh.beads.length, 0);
    return beads.length + pendantBeadCount + chainBeadCount + decorTailBeadCount + toothBeadCount;
  }, [
    beads.length, validPendantPlacements, pendantTemplates, validPendantChains,
    validDecorTailPlacements, validTeeth,
  ]);

  return {
    validPendantPlacements, validPendantChains, validDecorTailPlacements, validTeeth,
    extendStats, totalCount,
  };
};
