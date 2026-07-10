import { useMemo } from 'react';
import { Bead, BottomEdgeDecor, GridConfig } from '../types/bead';
import { generateSilyankaGrid } from '../utils/generator';

export const useGrid = (
  config: GridConfig,
  rowSpanOverrides: Record<number, number>,
  decorBands: Record<number, number>,
  bottomEdgeDecor: BottomEdgeDecor,
): Bead[] => {
  return useMemo(() => {
    return generateSilyankaGrid(
      config.width,
      config.height,
      config.spacing,
      config.topSpan,
      config.bottomSpan,
      rowSpanOverrides,
      decorBands,
      bottomEdgeDecor.enabled,
      bottomEdgeDecor.span
    );
  }, [config.width, config.height, config.spacing, config.topSpan, config.bottomSpan, rowSpanOverrides, decorBands, bottomEdgeDecor]);
};
