import { useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { ToothPlacement } from '../types/pendant';
import { toothOverlaps } from '../utils/tooth';
import { DrawingTool } from './useDrawing';

export const useTeeth = (
  teeth: ToothPlacement[],
  setTeeth: Dispatch<SetStateAction<ToothPlacement[]>>,
  activeColor: string,
  activeTool: DrawingTool,
  mirrorMode: boolean,
  width: number,
) => {
  // Пересечение соседних зубцов (включая касание общей колонкой) запрещено
  // (см. spec.md, «Зубец») — попытка поставить пересекающийся зубец молча
  // не добавляет ничего, вызывающая сторона (handleToothNodeClick) всё равно
  // сбрасывает pending-выбор, как при обычной успешной простановке.
  const addTooth = useCallback((colA: number, colB: number) => {
    if (colA === colB) return;
    const startCol = Math.min(colA, colB);
    const endCol = Math.max(colA, colB);
    setTeeth((prev) => {
      if (toothOverlaps(startCol, endCol, prev)) return prev;
      const next = [
        ...prev,
        { placementId: crypto.randomUUID(), startCol, endCol, colorMap: {} },
      ];
      // Нижний ряд — чётный, зеркало точное: col c ↔ col (width-1-c). Если
      // зеркальный диапазон пересекается с чем-то существующим (включая
      // только что добавленный основной) — пропускаем именно зеркало, не всю
      // операцию: пользователь всё равно получает то, что кликнул.
      if (mirrorMode && width > 1) {
        const mirrorStart = width - 1 - endCol;
        const mirrorEnd = width - 1 - startCol;
        if (
          (mirrorStart !== startCol || mirrorEnd !== endCol) &&
          !toothOverlaps(mirrorStart, mirrorEnd, next)
        ) {
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
  }, [setTeeth, mirrorMode, width]);

  // Набор placementId, которые меняются вместе с целевым зубцом: сам зубец
  // + его зеркальная пара (только в зеркальном режиме) — см. usePendantChains.ts.
  const withMirror = useCallback((
    prev: ToothPlacement[],
    placementId: string,
  ): Set<string> => {
    const ids = new Set([placementId]);
    if (!mirrorMode || width <= 1) return ids;
    const target = prev.find((t) => t.placementId === placementId);
    if (!target) return ids;
    const mirrorStart = width - 1 - target.endCol;
    const mirrorEnd = width - 1 - target.startCol;
    const mirror = prev.find((t) =>
      t.placementId !== placementId && t.startCol === mirrorStart && t.endCol === mirrorEnd);
    if (mirror) ids.add(mirror.placementId);
    return ids;
  }, [mirrorMode, width]);

  const removeTooth = useCallback((placementId: string) => {
    setTeeth((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.filter((t) => !ids.has(t.placementId));
    });
  }, [setTeeth, withMirror]);

  const clearAllTeeth = useCallback(() => {
    setTeeth([]);
  }, [setTeeth]);

  const paintToothBead = useCallback((placementId: string, beadIndex: number) => {
    setTeeth((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.map((t) => {
        if (!ids.has(t.placementId)) return t;
        if (activeTool === 'eraser') {
          const next = { ...t.colorMap };
          delete next[beadIndex];
          return { ...t, colorMap: next };
        }
        return { ...t, colorMap: { ...t.colorMap, [beadIndex]: activeColor } };
      });
    });
  }, [setTeeth, activeColor, activeTool, withMirror]);

  // useMemo — см. usePendantChains.ts: без него объект-обёртка менялся бы на
  // каждый рендер и пробивал memo везде, где используется целиком.
  return useMemo(
    () => ({ teeth, addTooth, removeTooth, clearAllTeeth, paintToothBead }),
    [teeth, addTooth, removeTooth, clearAllTeeth, paintToothBead],
  );
};
