import { useMemo } from 'react';
import { generateSilyankaGrid } from '../utils/generator';
import { Bead } from '../types/bead';

interface GridConfig {
  width: number;
  height: number;
  spacing: number;
  beadsInSpan: number;
}

export const useGrid = (config: GridConfig): Bead[] => {
  return useMemo(() => {
    return generateSilyankaGrid(
      config.width,
      config.height,
      config.spacing,
      config.beadsInSpan
    );
  }, [config.width, config.height, config.spacing, config.beadsInSpan]);
};