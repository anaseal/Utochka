import { useMemo } from 'react';
import { useDrawing } from './useDrawing';
import { usePersistedState } from './usePersistedState';
import { CROSS_WEAVE_THEME } from '../config/crossWeaveTheme';
import { CrossWeaveGridConfig } from '../types/crossWeaveBead';
import { PendantPlacement } from '../types/pendant';
import { generateCrossWeaveGrid } from '../utils/crossWeaveGenerator';
import { shiftCrossWeaveDesignMapColumns } from '../utils/crossWeaveMirror';

// CrossWeave не поддерживает подвески (MVP) — стабильные пустая ссылка и
// no-op сеттер, чтобы useDrawing не считал их «изменившимися» на каждый рендер.
const EMPTY_PENDANT_PLACEMENTS: PendantPlacement[] = [];
const noopSetPendantPlacements = () => {};

const isCrossWeaveGridConfig = (v: unknown): v is CrossWeaveGridConfig => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.width === 'number' && typeof obj.height === 'number' &&
    typeof obj.pitchX === 'number' && typeof obj.pitchY === 'number';
};

// gridSize.width/height — «логические» размеры: ровно то, что подписывает
// CrossWeaveRulers (число колонн = вертикальных овалов, число рядов =
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

// Состояние и обработчики CrossWeave — независимый MVP-проект: простая
// прямоугольная сетка овальных бисерин, без span/decor/pendant-концепций силянки.
export const useCrossWeaveProject = (palette: readonly string[]) => {
  const [gridSize, setGridSize] = usePersistedState<CrossWeaveGridConfig>('crossWeave:gridSize', {
    width: CROSS_WEAVE_THEME.gridDefaults.initialWidth,
    height: CROSS_WEAVE_THEME.gridDefaults.initialHeight,
    pitchX: CROSS_WEAVE_THEME.gridDefaults.spacing,
    pitchY: CROSS_WEAVE_THEME.gridDefaults.spacing,
  }, isCrossWeaveGridConfig);

  const [mirrorMode, setMirrorMode] = usePersistedState<boolean>(
    'crossWeave:mirrorMode', false, (v): v is boolean => typeof v === 'boolean',
  );

  const rawWidth = useMemo(
    () => toRawDimensions(gridSize.width, gridSize.height).rawWidth,
    [gridSize.width, gridSize.height],
  );

  const beads = useMemo(() => {
    const { rawWidth: rw, rawHeight } = toRawDimensions(gridSize.width, gridSize.height);
    return generateCrossWeaveGrid(rw, rawHeight, gridSize.pitchX, gridSize.pitchY);
  }, [gridSize.width, gridSize.height, gridSize.pitchX, gridSize.pitchY]);

  const drawingControls = useDrawing(
    palette[0], palette, EMPTY_PENDANT_PLACEMENTS, noopSetPendantPlacements, 'crossWeave',
  );

  // В Mirror Mode ширина меняется по ±2 (по колонке с каждой стороны), чтобы
  // рисунок остался по центру относительно оси — та же схема, что и у силянки
  // (см. useSilyankaProject.updateDimension).
  const updateDimension = (field: 'width' | 'height', delta: number) => {
    if (field === 'width' && mirrorMode) {
      const newW = gridSize.width + delta * 2;
      if (newW >= 1 && newW !== gridSize.width) {
        drawingControls.remapDesignMap(map =>
          shiftCrossWeaveDesignMapColumns(map, delta, newW + 1),
        );
        setGridSize(prev => ({ ...prev, width: newW }));
      }
      return;
    }
    const newVal = Math.max(1, gridSize[field] + delta);
    setGridSize(prev => ({ ...prev, [field]: newVal }));
  };

  const setWidthAbsolute = (v: number) => {
    const rounded = Math.max(1, Math.round(v));
    if (mirrorMode) {
      let newW = rounded;
      let diff = newW - gridSize.width;
      // Нечётную разницу округляем до чётной, чтобы сохранить центровку рисунка.
      if (diff % 2 !== 0) {
        newW += 1;
        diff += 1;
      }
      if (newW === gridSize.width) return;
      const delta = diff / 2;
      drawingControls.remapDesignMap(map =>
        shiftCrossWeaveDesignMapColumns(map, delta, newW + 1),
      );
      setGridSize(prev => ({ ...prev, width: newW }));
      return;
    }
    if (rounded === gridSize.width) return;
    setGridSize(prev => ({ ...prev, width: rounded }));
  };

  const setHeightAbsolute = (v: number) => {
    setGridSize(prev => ({ ...prev, height: Math.max(1, Math.round(v)) }));
  };

  const updateSpacing = (delta: number) => {
    const { minSpacing, maxSpacing } = CROSS_WEAVE_THEME.constraints;
    setGridSize(prev => {
      const next = Math.min(maxSpacing, Math.max(minSpacing, prev.pitchX + delta));
      return { ...prev, pitchX: next, pitchY: next };
    });
  };

  const setSpacingAbsolute = (v: number) => {
    const { minSpacing, maxSpacing } = CROSS_WEAVE_THEME.constraints;
    setGridSize(prev => {
      const next = Math.min(maxSpacing, Math.max(minSpacing, Math.round(v)));
      return { ...prev, pitchX: next, pitchY: next };
    });
  };

  return {
    gridSize, beads, drawingControls, rawWidth,
    mirrorMode, setMirrorMode,
    updateDimension, setWidthAbsolute, setHeightAbsolute,
    updateSpacing, setSpacingAbsolute,
  };
};

export type CrossWeaveProject = ReturnType<typeof useCrossWeaveProject>;
