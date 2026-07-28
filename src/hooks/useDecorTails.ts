import { useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { DecorTailPlacement } from '../types/pendant';
import { BEAD_THEME } from '../config/theme';
import { DrawingTool } from './useDrawing';

export const useDecorTails = (
  placements: DecorTailPlacement[],
  setPlacements: Dispatch<SetStateAction<DecorTailPlacement[]>>,
  activeColor: string,
  activeTool: DrawingTool,
  mirrorMode: boolean,
  width: number,
) => {
  // В отличие от подвесок (drop всегда заменяет), повторный drop карточки
  // «Tail» на уже занятую колонку убирает хвост — тот же toggle, что у
  // Decor Bands (handleDecorDrop в useSilyankaProject.ts), т.к. карточка одна
  // и та же и выбора шаблона тут нет.
  const addPlacement = useCallback((col: number) => {
    setPlacements((prev) => {
      const cols = mirrorMode && width > 1
        ? [...new Set([col, width - 1 - col])]
        : [col];
      const targetCols = cols.filter((c) => c >= 0 && c < width);
      const hasAny = targetCols.some((c) => prev.some((p) => p.col === c));
      let next = prev.filter((p) => !targetCols.includes(p.col));
      if (!hasAny) {
        for (const c of targetCols) {
          next = [
            ...next,
            {
              placementId: crypto.randomUUID(),
              col: c,
              rows: BEAD_THEME.decorDefaults.minRows,
              colorMap: {},
            },
          ];
        }
      }
      return next;
    });
  }, [setPlacements, mirrorMode, width]);

  // Набор placementId, которые меняются вместе с целевым хвостом: сам хвост
  // + его зеркальная пара (только в зеркальном режиме) — см. usePendants.ts.
  const withMirror = useCallback((
    prev: DecorTailPlacement[],
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

  // ± длины хвоста — уход ниже minRows удаляет placement целиком (как
  // updateDecorBand у Decor Bands), а не клампится на минимуме.
  const updateLength = useCallback((placementId: string, delta: number) => {
    setPlacements((prev) => {
      const ids = withMirror(prev, placementId);
      const target = prev.find((p) => p.placementId === placementId);
      if (!target) return prev;
      const nextRows = target.rows + delta;
      if (nextRows < BEAD_THEME.decorDefaults.minRows) {
        return prev.filter((p) => !ids.has(p.placementId));
      }
      const clamped = Math.min(nextRows, BEAD_THEME.decorDefaults.maxRows);
      return prev.map((p) => {
        if (!ids.has(p.placementId)) return p;
        // Обрезаем colorMap бисерин, которые перестали существовать при
        // уменьшении длины — иначе они «оживут» при следующем увеличении.
        const colorMap = Object.fromEntries(
          Object.entries(p.colorMap).filter(([idx]) => Number(idx) < clamped),
        );
        return { ...p, rows: clamped, colorMap };
      });
    });
  }, [setPlacements, withMirror]);

  const paintBead = useCallback((placementId: string, beadIndex: number) => {
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

  return useMemo(
    () => ({ placements, addPlacement, removePlacement, clearAllPlacements, updateLength, paintBead }),
    [placements, addPlacement, removePlacement, clearAllPlacements, updateLength, paintBead],
  );
};
