import { useMemo } from 'react';
import { useDrawing } from './useDrawing';
import { usePersistedState } from './usePersistedState';
import { KRESTIK_THEME } from '../config/krestikTheme';
import { KrestikGridConfig } from '../types/krestikBead';
import { PendantPlacement } from '../types/pendant';
import { generateKrestikGrid } from '../utils/krestikGenerator';

// Крестик не поддерживает подвески (MVP) — стабильные пустая ссылка и
// no-op сеттер, чтобы useDrawing не считал их «изменившимися» на каждый рендер.
const EMPTY_PENDANT_PLACEMENTS: PendantPlacement[] = [];
const noopSetPendantPlacements = () => {};

const isKrestikGridConfig = (v: unknown): v is KrestikGridConfig => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.width === 'number' && typeof obj.height === 'number' &&
    typeof obj.pitchX === 'number' && typeof obj.pitchY === 'number';
};

// gridSize.width/height — «логические» размеры: ровно то, что подписывает
// KrestikRulers (число колонн = вертикальных овалов, число рядов =
// горизонтальных овалов), а не сырые параметры генератора. Раскладка
// генератора: вертикальный ряд короче горизонтального на 1 бусину, а между
// каждой парой горизонтальных рядов вклинивается вертикальный (и по одному
// вертикальному — по краям), поэтому:
//   rawWidth  = logicalWidth + 1
//   rawHeight = 2 · logicalHeight + 1
// Это одновременно гарантирует, что физический ряд 0 и последний ряд всегда
// вертикальные (плетение начинается и заканчивается на вертикальном овале)
// без отдельной санитизации чётности.
const toRawDimensions = (logicalWidth: number, logicalHeight: number) => ({
  rawWidth: logicalWidth + 1,
  rawHeight: logicalHeight * 2 + 1,
});

// Состояние и обработчики крестика — независимый MVP-проект: простая
// прямоугольная сетка овальных бисерин, без span/decor/pendant-концепций силянки.
export const useKrestikProject = (palette: readonly string[]) => {
  const [gridSize, setGridSize] = usePersistedState<KrestikGridConfig>('krestik:gridSize', {
    width: KRESTIK_THEME.gridDefaults.initialWidth,
    height: KRESTIK_THEME.gridDefaults.initialHeight,
    pitchX: KRESTIK_THEME.gridDefaults.spacing,
    pitchY: KRESTIK_THEME.gridDefaults.spacing,
  }, isKrestikGridConfig);

  const beads = useMemo(() => {
    const { rawWidth, rawHeight } = toRawDimensions(gridSize.width, gridSize.height);
    return generateKrestikGrid(rawWidth, rawHeight, gridSize.pitchX, gridSize.pitchY);
  }, [gridSize.width, gridSize.height, gridSize.pitchX, gridSize.pitchY]);

  const drawingControls = useDrawing(
    palette[0], palette, EMPTY_PENDANT_PLACEMENTS, noopSetPendantPlacements, 'krestik',
  );

  const updateDimension = (field: 'width' | 'height', delta: number) => {
    const newVal = Math.max(1, gridSize[field] + delta);
    setGridSize(prev => ({ ...prev, [field]: newVal }));
  };

  const setWidthAbsolute = (v: number) => {
    setGridSize(prev => ({ ...prev, width: Math.max(1, Math.round(v)) }));
  };

  const setHeightAbsolute = (v: number) => {
    setGridSize(prev => ({ ...prev, height: Math.max(1, Math.round(v)) }));
  };

  const updateSpacing = (delta: number) => {
    const { minSpacing, maxSpacing } = KRESTIK_THEME.constraints;
    setGridSize(prev => {
      const next = Math.min(maxSpacing, Math.max(minSpacing, prev.pitchX + delta));
      return { ...prev, pitchX: next, pitchY: next };
    });
  };

  const setSpacingAbsolute = (v: number) => {
    const { minSpacing, maxSpacing } = KRESTIK_THEME.constraints;
    setGridSize(prev => {
      const next = Math.min(maxSpacing, Math.max(minSpacing, Math.round(v)));
      return { ...prev, pitchX: next, pitchY: next };
    });
  };

  return {
    gridSize, beads, drawingControls,
    updateDimension, setWidthAbsolute, setHeightAbsolute,
    updateSpacing, setSpacingAbsolute,
  };
};

export type KrestikProject = ReturnType<typeof useKrestikProject>;
