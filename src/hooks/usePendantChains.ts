import { useCallback, Dispatch, SetStateAction } from 'react';
import { PendantChain } from '../types/pendant';
import { DrawingTool } from './useDrawing';

export const usePendantChains = (
  chains: PendantChain[],
  setChains: Dispatch<SetStateAction<PendantChain[]>>,
  activeColor: string,
  activeTool: DrawingTool,
  mirrorMode: boolean,
  width: number,
) => {
  // От одной ноды может идти несколько цепочек, и цепочка может соседствовать
  // с обычной подвеской на той же ноде — в отличие от usePendants здесь нет
  // проверки «одна на колонку».
  const addChain = useCallback((colA: number, colB: number) => {
    if (colA === colB) return;
    const startCol = Math.min(colA, colB);
    const endCol = Math.max(colA, colB);
    setChains((prev) => {
      const next = [
        ...prev,
        { placementId: crypto.randomUUID(), startCol, endCol, colorMap: {} },
      ];
      // Нижний ряд — чётный, зеркало точное: col c ↔ col (width-1-c).
      if (mirrorMode && width > 1) {
        const mirrorStart = width - 1 - endCol;
        const mirrorEnd = width - 1 - startCol;
        if (mirrorStart !== startCol || mirrorEnd !== endCol) {
          next.push({
            placementId: crypto.randomUUID(),
            startCol: mirrorStart,
            endCol: mirrorEnd,
            colorMap: {},
          });
        }
      }
      return next;
    });
  }, [setChains, mirrorMode, width]);

  // Набор placementId, которые меняются вместе с целевой цепочкой: сама
  // цепочка + её зеркальная пара (только в зеркальном режиме).
  const withMirror = useCallback((
    prev: PendantChain[],
    placementId: string,
  ): Set<string> => {
    const ids = new Set([placementId]);
    if (!mirrorMode || width <= 1) return ids;
    const target = prev.find((c) => c.placementId === placementId);
    if (!target) return ids;
    const mirrorStart = width - 1 - target.endCol;
    const mirrorEnd = width - 1 - target.startCol;
    const mirror = prev.find((c) =>
      c.placementId !== placementId && c.startCol === mirrorStart && c.endCol === mirrorEnd);
    if (mirror) ids.add(mirror.placementId);
    return ids;
  }, [mirrorMode, width]);

  const removeChain = useCallback((placementId: string) => {
    setChains((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.filter((c) => !ids.has(c.placementId));
    });
  }, [setChains, withMirror]);

  const clearAllChains = useCallback(() => {
    setChains([]);
  }, [setChains]);

  const paintChainBead = useCallback((placementId: string, beadIndex: number) => {
    setChains((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.map((c) => {
        if (!ids.has(c.placementId)) return c;
        if (activeTool === 'eraser') {
          const next = { ...c.colorMap };
          delete next[beadIndex];
          return { ...c, colorMap: next };
        }
        return { ...c, colorMap: { ...c.colorMap, [beadIndex]: activeColor } };
      });
    });
  }, [setChains, activeColor, activeTool, withMirror]);

  return { chains, addChain, removeChain, clearAllChains, paintChainBead };
};
