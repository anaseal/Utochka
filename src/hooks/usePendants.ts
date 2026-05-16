import { useCallback, Dispatch, SetStateAction } from 'react';
import { PendantPlacement } from '../types/pendant';
import { DrawingTool } from './useDrawing';

export const usePendants = (
  placements: PendantPlacement[],
  setPlacements: Dispatch<SetStateAction<PendantPlacement[]>>,
  activeColor: string,
  activeTool: DrawingTool,
  mirrorMode: boolean,
  width: number,
) => {
  const addPlacement = useCallback((templateId: string, col: number) => {
    setPlacements((prev) => {
      // В зеркальном режиме подвеска добавляется и на симметричную колонку.
      // Нижний ряд — чётный, поэтому зеркало колонки c — это width-1-c.
      const cols = mirrorMode && width > 1
        ? [...new Set([col, width - 1 - col])]
        : [col];
      const targetCols = cols.filter((c) => c >= 0 && c < width);
      // Снимаем подвески с целевых колонок — новая их заменяет.
      let next = prev.filter((p) => !targetCols.includes(p.col));
      for (const c of targetCols) {
        next = [
          ...next,
          {
            placementId: crypto.randomUUID(),
            templateId,
            col: c,
            colorMap: {},
          },
        ];
      }
      return next;
    });
  }, [setPlacements, mirrorMode, width]);

  // Набор placementId, которые меняются вместе с целевой подвеской:
  // сама подвеска + её зеркальная пара (только в зеркальном режиме).
  const withMirror = useCallback((
    prev: PendantPlacement[],
    placementId: string,
  ): Set<string> => {
    const ids = new Set([placementId]);
    if (!mirrorMode || width <= 1) return ids;
    const target = prev.find((p) => p.placementId === placementId);
    if (!target) return ids;
    const mirrorCol = width - 1 - target.col;
    const mirror = prev.find((p) => p.col === mirrorCol);
    if (mirror) ids.add(mirror.placementId);
    return ids;
  }, [mirrorMode, width]);

  const removePlacement = useCallback((placementId: string) => {
    setPlacements((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.filter((p) => !ids.has(p.placementId));
    });
  }, [setPlacements, withMirror]);

  const clearAllPlacements = useCallback(() => {
    setPlacements([]);
  }, [setPlacements]);

  const paintPendantBead = useCallback((placementId: string, beadIndex: number) => {
    setPlacements((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.map((p) => {
        if (!ids.has(p.placementId)) return p;
        if (activeTool === 'eraser') {
          const next = { ...p.colorMap };
          delete next[beadIndex];
          return { ...p, colorMap: next };
        }
        return { ...p, colorMap: { ...p.colorMap, [beadIndex]: activeColor } };
      });
    });
  }, [setPlacements, activeColor, activeTool, withMirror]);

  return { placements, addPlacement, removePlacement, clearAllPlacements, paintPendantBead };
};
