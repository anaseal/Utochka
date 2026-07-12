import { useCallback, useMemo } from 'react';
import { useDrawing } from './useDrawing';
import { usePersistedState } from './usePersistedState';
import { CROSS_WEAVE_THEME, defaultColorForCrossWeave } from '../config/crossWeaveTheme';
import { CrossWeaveGridConfig } from '../types/crossWeaveBead';
import { PendantPlacement } from '../types/pendant';
import { generateCrossWeaveGrid } from '../utils/crossWeaveGenerator';
import { mirrorCrossWeaveBeadId, shiftCrossWeaveDesignMapColumns } from '../utils/crossWeaveMirror';
import { computeCrossWeaveFloodFill } from '../utils/crossWeaveFloodFill';
import { clamp } from '../utils/clamp';
import { resizeWidthAbsolute, resizeWidthRelative, WidthResizeResult } from '../utils/gridResize';

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

  // Заливка: BFS по графу физической смежности бисерин (см.
  // crossWeaveFloodFill.ts) — своя, отдельная от силяночной
  // computeUnifiedFloodFill, т.к. тут нет node/span/pendant. В Mirror Mode
  // заливка выполняется и для зеркальной бисерины, оба результата уходят в
  // один снимок истории (applyPatch), как и у силянки.
  const handleFloodFill = useCallback((startId: string) => {
    const ids = new Set(computeCrossWeaveFloodFill(
      startId, beads, drawingControls.designMap, drawingControls.activeColor, defaultColorForCrossWeave(),
    ));

    if (mirrorMode) {
      const mirrorStartId = mirrorCrossWeaveBeadId(startId, rawWidth);
      if (mirrorStartId && mirrorStartId !== startId) {
        for (const id of computeCrossWeaveFloodFill(
          mirrorStartId, beads, drawingControls.designMap, drawingControls.activeColor, defaultColorForCrossWeave(),
        )) ids.add(id);
      }
    }

    if (ids.size === 0) return;
    const activeColor = drawingControls.activeColor;
    drawingControls.applyPatch((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = activeColor;
      return next;
    }, null);
  }, [beads, drawingControls, mirrorMode, rawWidth]);

  // Общий обработчик результата resizeWidthRelative/resizeWidthAbsolute:
  // сдвиг designMap в Mirror Mode (та же схема, что и у силянки — см.
  // useSilyankaProject.applyWidth) и запись gridSize.
  const applyWidth = (result: WidthResizeResult | null, wasMirror: boolean) => {
    if (!result) return;
    const { newWidth, mirrorDelta } = result;
    if (wasMirror) {
      drawingControls.remapDesignMap(map =>
        shiftCrossWeaveDesignMapColumns(map, mirrorDelta, newWidth + 1),
      );
    }
    setGridSize(prev => ({ ...prev, width: newWidth }));
  };

  const updateDimension = (field: 'width' | 'height', delta: number) => {
    if (field === 'width') {
      applyWidth(resizeWidthRelative(gridSize.width, delta, mirrorMode), mirrorMode);
      return;
    }
    const newVal = Math.max(1, gridSize[field] + delta);
    setGridSize(prev => ({ ...prev, [field]: newVal }));
  };

  const setWidthAbsolute = (v: number) => {
    applyWidth(resizeWidthAbsolute(gridSize.width, v, mirrorMode), mirrorMode);
  };

  const setHeightAbsolute = (v: number) => {
    setGridSize(prev => ({ ...prev, height: Math.max(1, Math.round(v)) }));
  };

  const updateSpacing = (delta: number) => {
    const { minSpacing, maxSpacing } = CROSS_WEAVE_THEME.constraints;
    setGridSize(prev => {
      const next = clamp(prev.pitchX + delta, minSpacing, maxSpacing);
      return { ...prev, pitchX: next, pitchY: next };
    });
  };

  const setSpacingAbsolute = (v: number) => {
    const { minSpacing, maxSpacing } = CROSS_WEAVE_THEME.constraints;
    setGridSize(prev => {
      const next = clamp(Math.round(v), minSpacing, maxSpacing);
      return { ...prev, pitchX: next, pitchY: next };
    });
  };

  return {
    gridSize, beads, drawingControls, rawWidth,
    mirrorMode, setMirrorMode,
    updateDimension, setWidthAbsolute, setHeightAbsolute,
    updateSpacing, setSpacingAbsolute,
    handleFloodFill,
  };
};

export type CrossWeaveProject = ReturnType<typeof useCrossWeaveProject>;
