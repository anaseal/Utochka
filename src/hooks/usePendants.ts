import { useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { PendantAnchor, PendantPlacement, ToothPlacement } from '../types/pendant';
import { pendantAnchorsEqual, mirrorPendantAnchor } from '../utils/pendantAnchor';
import { DrawingTool } from './useDrawing';

// Находит зеркальную подвеску по placementId — по образцу findMirrorChain в
// usePendantChains.ts. Общая для withMirror ниже и для mirror-заливки
// (handlePendantPaint в useSilyankaProject.ts).
export const findMirrorPendant = (
  placements: PendantPlacement[],
  placementId: string,
  teeth: ToothPlacement[],
  width: number,
): PendantPlacement | undefined => {
  const target = placements.find((p) => p.placementId === placementId);
  if (!target) return undefined;
  const mirrorAnchor = mirrorPendantAnchor(target.anchor, teeth, width);
  if (!mirrorAnchor) return undefined;
  return placements.find((p) =>
    p.placementId !== placementId && pendantAnchorsEqual(p.anchor, mirrorAnchor));
};

export const usePendants = (
  placements: PendantPlacement[],
  setPlacements: Dispatch<SetStateAction<PendantPlacement[]>>,
  activeColor: string,
  activeTool: DrawingTool,
  mirrorMode: boolean,
  width: number,
  // Нужен только для зеркалирования подвески на узле-границе зубца (см.
  // mirrorPendantAnchor) — сама простановка/покраска подвески геометрию меша
  // зубца (toothMeshes) не трогает.
  teeth: ToothPlacement[],
) => {
  const addPlacement = useCallback((templateId: string, anchor: PendantAnchor) => {
    setPlacements((prev) => {
      const anchors = [anchor];
      // В зеркальном режиме подвеска добавляется и на симметричный якорь
      // (сетка — по колонке, зубец — по своей зеркальной паре в teeth).
      if (mirrorMode && width > 1) {
        const mirror = mirrorPendantAnchor(anchor, teeth, width);
        if (mirror && !pendantAnchorsEqual(mirror, anchor)) anchors.push(mirror);
      }
      // Снимаем подвески с целевых якорей — новая их заменяет.
      let next = prev.filter((p) => !anchors.some((a) => pendantAnchorsEqual(a, p.anchor)));
      for (const a of anchors) {
        next = [...next, { placementId: crypto.randomUUID(), templateId, anchor: a, colorMap: {} }];
      }
      return next;
    });
  }, [setPlacements, mirrorMode, width, teeth]);

  // Снимает точечные подвески с сеточных якорей в [startCol, endCol] — зовётся
  // при простановке зубца (см. spec.md, «Зубец»): зубец занимает эти ноды
  // нижнего ряда целиком, точечная подвеска там не держится.
  const removeGridPlacementsInRange = useCallback((startCol: number, endCol: number) => {
    setPlacements((prev) => prev.filter((p) =>
      !(p.anchor.kind === 'grid' && p.anchor.col >= startCol && p.anchor.col <= endCol)));
  }, [setPlacements]);

  // Набор placementId, которые меняются вместе с целевой подвеской:
  // сама подвеска + её зеркальная пара (только в зеркальном режиме).
  const withMirror = useCallback((
    prev: PendantPlacement[],
    placementId: string,
  ): Set<string> => {
    const ids = new Set([placementId]);
    if (!mirrorMode || width <= 1) return ids;
    const mirror = findMirrorPendant(prev, placementId, teeth, width);
    if (mirror) ids.add(mirror.placementId);
    return ids;
  }, [mirrorMode, width, teeth]);

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

  // useMemo — см. usePendantChains.ts/useThreads.ts, тот же приём.
  return useMemo(
    () => ({
      placements, addPlacement, removePlacement, clearAllPlacements, paintPendantBead,
      removeGridPlacementsInRange,
    }),
    [placements, addPlacement, removePlacement, clearAllPlacements, paintPendantBead,
      removeGridPlacementsInRange],
  );
};
