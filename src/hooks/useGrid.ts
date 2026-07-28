import { useMemo } from 'react';
import { Bead, BottomEdgeDecor, EdgeExtension, GridConfig, Taper } from '../types/bead';
import { generateSilyankaGrid } from '../utils/generator';
import { resolveSpanCount } from '../utils/spans';

export const useGrid = (
  config: GridConfig,
  rowSpanOverrides: Record<number, number>,
  decorBands: Record<number, number>,
  bottomEdgeDecor: BottomEdgeDecor,
  edgeExtension: EdgeExtension,
  topEdgeEnabled: boolean,
  taper: Taper,
): Bead[] => {
  return useMemo(() => {
    // Нижняя горизонтальная цепочка (r=-2) — тот же rowSpanOverrides, что и
    // верхняя (r=-1): по умолчанию равна bottomSpan, override — как у любого
    // ряда (см. resolveSpanCount, useSilyankaProject.ts → internalBottom).
    const bottomEdgeSpan = resolveSpanCount(-2, config.topSpan, config.bottomSpan, rowSpanOverrides);
    return generateSilyankaGrid(
      config.width,
      config.height,
      config.spacing,
      config.topSpan,
      config.bottomSpan,
      rowSpanOverrides,
      decorBands,
      bottomEdgeDecor.enabled,
      bottomEdgeSpan,
      edgeExtension.left,
      edgeExtension.right,
      topEdgeEnabled,
      taper
    );
  }, [
    config.width, config.height, config.spacing, config.topSpan, config.bottomSpan,
    rowSpanOverrides, decorBands, bottomEdgeDecor, edgeExtension, topEdgeEnabled, taper,
  ]);
};
