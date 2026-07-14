import { PendantPlacement, PendantChain } from '../types/pendant';

// Заменяет oldColor на newColor во всех значениях карты; возвращает тот же
// объект без изменений (референс сохраняется), если совпадений нет — вызывающий
// код (applyPatch) сравнивает по референсу, чтобы не писать пустой шаг истории.
export const swapColorInMap = <K extends string | number>(
  map: Record<K, string>,
  oldColor: string,
  newColor: string,
): Record<K, string> => {
  if (oldColor === newColor) return map;
  let changed = false;
  const next = {} as Record<K, string>;
  for (const [id, color] of Object.entries(map) as [K, string][]) {
    if (color === oldColor) {
      next[id] = newColor;
      changed = true;
    } else {
      next[id] = color;
    }
  }
  return changed ? next : map;
};

export const swapColorInPendants = (
  placements: PendantPlacement[],
  oldColor: string,
  newColor: string,
): PendantPlacement[] => {
  if (oldColor === newColor) return placements;
  let changed = false;
  const next = placements.map((p) => {
    const swappedColorMap = swapColorInMap(p.colorMap, oldColor, newColor);
    if (swappedColorMap === p.colorMap) return p;
    changed = true;
    return { ...p, colorMap: swappedColorMap };
  });
  return changed ? next : placements;
};

export const swapColorInChains = (
  chains: PendantChain[],
  oldColor: string,
  newColor: string,
): PendantChain[] => {
  if (oldColor === newColor) return chains;
  let changed = false;
  const next = chains.map((c) => {
    const swappedColorMap = swapColorInMap(c.colorMap, oldColor, newColor);
    if (swappedColorMap === c.colorMap) return c;
    changed = true;
    return { ...c, colorMap: swappedColorMap };
  });
  return changed ? next : chains;
};
