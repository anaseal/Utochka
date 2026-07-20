import { useMemo } from 'react';
import { Bead, BottomEdgeDecor, EdgeExtension, GridConfig } from '../types/bead';
import { generateSilyankaGrid } from '../utils/generator';

export const useGrid = (
  config: GridConfig,
  rowSpanOverrides: Record<number, number>,
  decorBands: Record<number, number>,
  bottomEdgeDecor: BottomEdgeDecor,
  edgeExtension: EdgeExtension,
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
      bottomEdgeDecor.span,
      edgeExtension.left,
      edgeExtension.right
    );
  }, [
    config.width, config.height, config.spacing, config.topSpan, config.bottomSpan,
    rowSpanOverrides, decorBands, bottomEdgeDecor, edgeExtension,
  ]);
};
