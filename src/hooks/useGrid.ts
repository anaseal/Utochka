/* src/hooks/useGrid.ts */
import { useMemo } from 'react';
import { Bead, GridConfig } from '../types/bead';
import { generateSilyankaGrid } from '../utils/generator';

/**
 * Хук для получения массива бисерин.
 * Является оберткой над генератором для обеспечения мемоизации[cite: 1].
 */
export const useGrid = (config: GridConfig): Bead[] => {
  return useMemo(() => {
    return generateSilyankaGrid(
      config.width, 
      config.height, 
      config.spacing, 
      config.topSpan, 
      config.bottomSpan
    );
  }, [config.width, config.height, config.spacing, config.topSpan, config.bottomSpan]);
};