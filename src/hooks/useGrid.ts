import { useMemo } from 'react';
import { Bead, GridConfig } from '../types/bead';
import { generateSilyankaGrid } from '../utils/generator';

export const useGrid = (
  config: GridConfig,
  rowSpanOverrides: Record<number, number>,
  decorBands: Record<number, number>,
): Bead[] => {
  return useMemo(() => {
    return generateSilyankaGrid(
      config.width,
      config.height,
      config.spacing,
      config.topSpan,
      config.bottomSpan,
      rowSpanOverrides,
      decorBands
    );
  }, [config.width, config.height, config.spacing, config.topSpan, config.bottomSpan, rowSpanOverrides, decorBands]);
};
