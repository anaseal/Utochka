/* FILE: src\hooks\usePendantStats.ts */
import { useCallback, useMemo } from 'react';
import { Bead } from '../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement } from '../types/pendant';
import { defaultColorFor } from '../config/theme';
import { chainBeadCountBetween } from '../utils/pendantChain';

interface UsePendantStatsOptions {
  beads: Bead[];
  pendantPlacements: PendantPlacement[];
  pendantTemplates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  pendantChains: PendantChain[];
  decorTailPlacements: DecorTailPlacement[];
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
}: UsePendantStatsOptions) => {
  // Подвеска учитывается в статистике, только если у неё есть и валидный
  // шаблон, и живая нода-якорь на нижнем ряду (та же проверка, что и в
  // PendantLayer для occupiedCols).
  const validPendantPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return pendantPlacements.filter(
      (p) => pendantTemplates[p.templateId] && bottomCols.has(p.col),
    );
  }, [pendantPlacements, pendantTemplates, bottomNodes]);

  // Цепочка учитывается в статистике, только если у неё живы оба узла-якоря
  // на нижнем ряду (та же проверка, что и у validPendantPlacements).
  const validPendantChains = useMemo(() => {
    const nodeByCol = new Map(bottomNodes.map(n => [n.logicalIndex.col, n]));
    return pendantChains
      .map((c) => {
        const start = nodeByCol.get(c.startCol);
        const end = nodeByCol.get(c.endCol);
        if (!start || !end) return null;
        return { chain: c, count: chainBeadCountBetween(start, end) };
      })
      .filter((v): v is { chain: PendantChain; count: number } => v !== null);
  }, [pendantChains, bottomNodes]);

  // Хвост учитывается в статистике, только если у него жива нода-якорь на
  // нижнем ряду (та же проверка, что и у validPendantPlacements).
  const validDecorTailPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return decorTailPlacements.filter((t) => bottomCols.has(t.col));
  }, [decorTailPlacements, bottomNodes]);

  const extendStats = useCallback((stats: Map<string, number>) => {
    validPendantPlacements.forEach((p) => {
      const template = pendantTemplates[p.templateId];
      template.beads.forEach((bead, index) => {
        const color = p.colorMap[index] ?? defaultColorFor(bead.type);
        stats.set(color, (stats.get(color) || 0) + 1);
      });
    });
    validPendantChains.forEach(({ chain, count }) => {
      for (let i = 0; i < count; i++) {
        const color = chain.colorMap[i] ?? defaultColorFor('SPAN');
        stats.set(color, (stats.get(color) || 0) + 1);
      }
    });
    validDecorTailPlacements.forEach((t) => {
      for (let i = 0; i < t.rows; i++) {
        const color = t.colorMap[i] ?? defaultColorFor('SPAN');
        stats.set(color, (stats.get(color) || 0) + 1);
      }
    });
  }, [validPendantPlacements, pendantTemplates, validPendantChains, validDecorTailPlacements]);

  const totalCount = useMemo(() => {
    const pendantBeadCount = validPendantPlacements.reduce(
      (sum, p) => sum + pendantTemplates[p.templateId].beads.length,
      0,
    );
    const chainBeadCount = validPendantChains.reduce((sum, { count }) => sum + count, 0);
    const decorTailBeadCount = validDecorTailPlacements.reduce((sum, t) => sum + t.rows, 0);
    return beads.length + pendantBeadCount + chainBeadCount + decorTailBeadCount;
  }, [beads.length, validPendantPlacements, pendantTemplates, validPendantChains, validDecorTailPlacements]);

  return {
    validPendantPlacements, validPendantChains, validDecorTailPlacements, extendStats, totalCount,
  };
};
