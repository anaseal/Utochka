import { useCallback, useMemo } from 'react';
import { useDrawing } from './useDrawing';
import { useThreads } from './useThreads';
import { useWeaveProgress } from './useWeaveProgress';
import { usePersistedState } from './usePersistedState';
import { CROSS_WEAVE_THEME, defaultColorForCrossWeave } from '../config/crossWeaveTheme';
import { THREAD_STRAND_DEFAULT_COLORS, DEFAULT_THREAD_OPACITY } from '../config/theme';
import { CrossWeaveGridConfig } from '../types/crossWeaveBead';
import { PendantPlacement, PendantChain } from '../types/pendant';
import { Thread } from '../types/thread';
import { generateCrossWeaveGrid } from '../utils/crossWeaveGenerator';
import { mirrorCrossWeaveBeadId, shiftCrossWeaveDesignMapColumns } from '../utils/crossWeaveMirror';
import { computeCrossWeaveFloodFill } from '../utils/crossWeaveFloodFill';
import { fillMissingMirror } from '../utils/symmetrize';
import { clamp } from '../utils/clamp';
import { resizeWidthAbsolute, resizeWidthRelative, WidthResizeResult } from '../utils/gridResize';

// CrossWeave не поддерживает подвески и цепочки-подвески (MVP) — стабильные
// пустая ссылка и no-op сеттер, чтобы useDrawing не считал их «изменившимися»
// на каждый рендер. Нитка (в отличие от подвесок) работает в обеих техниках —
// см. spec.md, «Нитка».
const EMPTY_PENDANT_PLACEMENTS: PendantPlacement[] = [];
const noopSetPendantPlacements = () => {};
const EMPTY_PENDANT_CHAINS: PendantChain[] = [];
const noopSetPendantChains = () => {};

const isThreads = (v: unknown): v is Thread[] =>
  Array.isArray(v) && v.every(t =>
    typeof t === 'object' && t !== null &&
    typeof (t as Thread).id === 'string' &&
    Array.isArray((t as Thread).beadIds) &&
    (t as Thread).beadIds.every(id => typeof id === 'string'));

const isThreadStrand = (v: unknown): v is 1 | 2 => v === 1 || v === 2;

const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

const isColorByStrand = (v: unknown): v is Record<1 | 2, string> => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return isHexColor(obj[1]) && isHexColor(obj[2]);
};

const isOpacity = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1;

const isOpacityByStrand = (v: unknown): v is Record<1 | 2, number> => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return isOpacity(obj[1]) && isOpacity(obj[2]);
};

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

  const [threads, setThreads] = usePersistedState<Thread[]>(
    'crossWeave:threads', [], isThreads,
  );

  // Крестик физически плетётся двумя нитками одновременно (силянка — одной,
  // см. spec.md, «Нитка») — какую из двух метить новым ниткам, выбирается
  // в Header (ThreadMenu) или хоткеями 1/2.
  const [activeThreadStrand, setActiveThreadStrand] = usePersistedState<1 | 2>(
    'crossWeave:activeThreadStrand', 1, isThreadStrand,
  );

  // «Кисть» нитки — отдельная на каждую из двух ниток (в отличие от силянки,
  // где нитка одна): иначе переключение Thread 1 ⇄ Thread 2 перестало бы
  // само по себе визуально различать нитки, пока пользователь вручную не
  // перекрасит хотя бы одну (см. useSilyankaProject.ts для техники с одной
  // нитью). Наружу отдаём уже разрешённые под activeThreadStrand значения —
  // CrossWeaveCanvasView/Header работают с плоскими activeThreadColor/
  // activeThreadOpacity, не зная про Record, как и у силянки.
  const [colorByStrand, setColorByStrand] = usePersistedState<Record<1 | 2, string>>(
    'crossWeave:activeThreadColorByStrand', { ...THREAD_STRAND_DEFAULT_COLORS }, isColorByStrand,
  );
  const [opacityByStrand, setOpacityByStrand] = usePersistedState<Record<1 | 2, number>>(
    'crossWeave:activeThreadOpacityByStrand', { 1: DEFAULT_THREAD_OPACITY, 2: DEFAULT_THREAD_OPACITY }, isOpacityByStrand,
  );
  const activeThreadColor = colorByStrand[activeThreadStrand];
  const activeThreadOpacity = opacityByStrand[activeThreadStrand];
  const setActiveThreadColor = useCallback((color: string) => {
    setColorByStrand(prev => ({ ...prev, [activeThreadStrand]: color }));
  }, [activeThreadStrand, setColorByStrand]);
  const setActiveThreadOpacity = useCallback((opacity: number) => {
    setOpacityByStrand(prev => ({ ...prev, [activeThreadStrand]: opacity }));
  }, [activeThreadStrand, setOpacityByStrand]);

  const drawingControls = useDrawing(
    palette[0], palette, EMPTY_PENDANT_PLACEMENTS, noopSetPendantPlacements,
    EMPTY_PENDANT_CHAINS, noopSetPendantChains, threads, setThreads, 'crossWeave',
  );
  const threadControls = useThreads(threads, drawingControls.applyPatch);

  // Прогресс плетения — свой у каждой техники (см. useWeaveProgress).
  const weave = useWeaveProgress('crossWeave');

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

  // Ретроактивная симметризация — тот же смысл, что и у силянки (см.
  // useSilyankaProject.makeSymmetric), но по формуле mirrorCrossWeaveBeadId.
  const makeSymmetric = useCallback(() => {
    drawingControls.remapDesignMap(map => fillMissingMirror(
      map,
      id => mirrorCrossWeaveBeadId(id, rawWidth),
    ));
  }, [drawingControls, rawWidth]);

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

  // «Reset all» панели Grid — та же роль, что и у силянки (см.
  // useSilyankaProject.resetGridAll), но состав меньше: у CrossWeave нет
  // edges/taper/decor в этой панели.
  const gridIsDefault = (
    gridSize.width === CROSS_WEAVE_THEME.gridDefaults.initialWidth &&
    gridSize.height === CROSS_WEAVE_THEME.gridDefaults.initialHeight &&
    gridSize.pitchX === CROSS_WEAVE_THEME.gridDefaults.spacing &&
    gridSize.pitchY === CROSS_WEAVE_THEME.gridDefaults.spacing
  );

  const resetGridAll = () => {
    setGridSize({
      width: CROSS_WEAVE_THEME.gridDefaults.initialWidth,
      height: CROSS_WEAVE_THEME.gridDefaults.initialHeight,
      pitchX: CROSS_WEAVE_THEME.gridDefaults.spacing,
      pitchY: CROSS_WEAVE_THEME.gridDefaults.spacing,
    });
  };

  return {
    gridSize, beads, drawingControls, rawWidth,
    threads, threadControls, weave, activeThreadStrand, setActiveThreadStrand,
    activeThreadColor, setActiveThreadColor, activeThreadOpacity, setActiveThreadOpacity,
    mirrorMode, setMirrorMode,
    updateDimension, setWidthAbsolute, setHeightAbsolute,
    updateSpacing, setSpacingAbsolute,
    handleFloodFill, makeSymmetric, resetGridAll, gridIsDefault,
  };
};

export type CrossWeaveProject = ReturnType<typeof useCrossWeaveProject>;
