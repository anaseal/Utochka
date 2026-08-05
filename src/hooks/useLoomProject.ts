import { useCallback, useMemo, useState } from 'react';
import { useDrawing } from './useDrawing';
import { usePersistedState } from './usePersistedState';
import { useWeaveProgress } from './useWeaveProgress';
import { LOOM_THEME, defaultColorForLoom, pitchYFromX } from '../config/loomTheme';
import { APP_CONSTRAINTS } from '../config/theme';
import { LoomGridConfig } from '../types/loomBead';
import { PendantPlacement, PendantChain, DecorTailPlacement, ToothPlacement } from '../types/pendant';
import { Thread } from '../types/thread';
import { generateLoomGrid } from '../utils/loomGenerator';
import { mirrorLoomBeadId, shiftLoomDesignMapColumns } from '../utils/loomMirror';
import { computeLoomFloodFill } from '../utils/loomFloodFill';
import {
  LoomStampPattern, LoomStampContext, captureLoomStampPattern, applyLoomStampPattern,
} from '../utils/loomStamp';
import { fillMissingMirror } from '../utils/symmetrize';
import { clamp } from '../utils/clamp';
import { resizeWidthAbsolute, resizeWidthRelative, WidthResizeResult } from '../utils/gridResize';
import { isIntInRange } from './useSilyankaProject.validators';

// Loom не поддерживает подвески, цепочки, декор-хвосты, зубцы И нитку (MVP,
// см. spec.md, «Loom») — стабильные пустые ссылки и no-op сеттеры, чтобы
// useDrawing не считал их «изменившимися» на каждый рендер. Как и у Peyote,
// нитки нет — но режим плетения ЕСТЬ у обеих: у Loom сегмент — целый ряд
// (см. useWeaveProgress ниже), у Peyote — целая колонка (другая геометрия
// проекта, см. usePeyoteProject.ts).
const EMPTY_PENDANT_PLACEMENTS: PendantPlacement[] = [];
const noopSetPendantPlacements = () => {};
const EMPTY_PENDANT_CHAINS: PendantChain[] = [];
const noopSetPendantChains = () => {};
const EMPTY_DECOR_TAIL_PLACEMENTS: DecorTailPlacement[] = [];
const noopSetDecorTailPlacements = () => {};
const EMPTY_TEETH: ToothPlacement[] = [];
const noopSetTeeth = () => {};
const EMPTY_THREADS: Thread[] = [];
const noopSetThreads = () => {};

const isLoomGridConfig = (v: unknown): v is LoomGridConfig => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  const { minSpacing, maxSpacing } = LOOM_THEME.constraints;
  return isIntInRange(obj.width, 1, APP_CONSTRAINTS.maxGridWidth) &&
    isIntInRange(obj.height, 1, APP_CONSTRAINTS.maxGridHeight) &&
    isIntInRange(obj.pitchX, minSpacing, maxSpacing);
};

// Состояние и обработчики Loom — независимый MVP-проект, геометрически
// ближе всего к Peyote (одна физическая бисерина на позицию решётки, без
// node/span), но без сдвига рядов вообще: у Loom все ряды одной ширины и в
// одной фазе, поэтому gridSize.width/height — это сразу и то, что генерирует
// generateLoomGrid, и то, что подписывает LoomRulers (см. spec.md).
export const useLoomProject = (palette: readonly string[]) => {
  const [gridSize, setGridSize] = usePersistedState<LoomGridConfig>('loom:gridSize', {
    width: LOOM_THEME.gridDefaults.initialWidth,
    height: LOOM_THEME.gridDefaults.initialHeight,
    pitchX: LOOM_THEME.gridDefaults.spacing,
  }, isLoomGridConfig);

  const [mirrorMode, setMirrorMode] = usePersistedState<boolean>(
    'loom:mirrorMode', false, (v): v is boolean => typeof v === 'boolean',
  );

  // pitchY выводится из pitchX — см. pitchYFromX в config/loomTheme.ts,
  // единственный источник правды (не хранится отдельным полем состояния).
  const beads = useMemo(
    () => generateLoomGrid(gridSize.width, gridSize.height, gridSize.pitchX, pitchYFromX(gridSize.pitchX)),
    [gridSize.width, gridSize.height, gridSize.pitchX],
  );

  const drawingControls = useDrawing(
    palette[0], palette, EMPTY_PENDANT_PLACEMENTS, noopSetPendantPlacements,
    EMPTY_PENDANT_CHAINS, noopSetPendantChains,
    EMPTY_DECOR_TAIL_PLACEMENTS, noopSetDecorTailPlacements,
    EMPTY_TEETH, noopSetTeeth, EMPTY_THREADS, noopSetThreads, 'loom',
  );

  // Прогресс плетения — свой у каждой техники (см. useWeaveProgress). У Loom
  // сегмент — целый ряд (loomRowSegment, utils/weaveSegment.ts), resolveStrokeIds
  // определён прямо в LoomCanvasView.tsx (по образцу CrossWeaveCanvasView.tsx).
  const weave = useWeaveProgress('loom');

  // Заливка: BFS по графу физической смежности бисерин (см. loomFloodFill.ts)
  // — своя, отдельная от Peyote/crossWeave/силяночной, т.к. тут другая
  // геометрия соседства (простая ортогональная). В Mirror Mode заливка
  // выполняется и для зеркальной бисерины, оба результата уходят в один
  // снимок истории.
  const handleFloodFill = useCallback((startId: string) => {
    const ids = new Set(computeLoomFloodFill(
      startId, beads, drawingControls.designMap, drawingControls.activeColor, defaultColorForLoom(),
    ));

    if (mirrorMode) {
      const mirrorStartId = mirrorLoomBeadId(startId, gridSize.width);
      if (mirrorStartId && mirrorStartId !== startId) {
        for (const id of computeLoomFloodFill(
          mirrorStartId, beads, drawingControls.designMap, drawingControls.activeColor, defaultColorForLoom(),
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
  }, [beads, drawingControls, mirrorMode, gridSize.width]);

  // Ретроактивная симметризация — тот же смысл, что и у силянки/crossWeave/
  // Peyote (см. useSilyankaProject.makeSymmetric), но по формуле mirrorLoomBeadId.
  const makeSymmetric = useCallback(() => {
    drawingControls.remapDesignMap(map => fillMissingMirror(
      map,
      id => mirrorLoomBeadId(id, gridSize.width),
    ));
  }, [drawingControls, gridSize.width]);

  // --- Штамп ------------------------------------------------------------
  // Тот же блок состояния, что у Peyote (usePeyoteProject.ts), без
  // stampAnchorEdge — у Loom нет top/bottom-структуры узора, якорь штампа
  // всегда левый верхний угол выделения (см. loomStamp.ts).
  const [stampPattern, setStampPattern] = useState<LoomStampPattern | null>(null);
  const [stampHoverNodeId, setStampHoverNodeId] = useState<string | null>(null);

  const stampCtx = useMemo<LoomStampContext>(() => ({
    width: gridSize.width,
    height: gridSize.height,
  }), [gridSize.width, gridSize.height]);

  const stampPreviewPatch = useMemo<Record<string, string> | null>(() => {
    if (!stampPattern || !stampHoverNodeId) return null;
    const targetBead = beads.find(b => b.id === stampHoverNodeId);
    if (!targetBead) return null;
    return applyLoomStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx);
  }, [stampPattern, stampHoverNodeId, beads, stampCtx]);

  const handleStampSelect = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const pattern = captureLoomStampPattern(ids, drawingControls.designMap);
    if (pattern.entries.length === 0) return;
    setStampPattern(pattern);
    setStampHoverNodeId(null);
  }, [drawingControls.designMap]);

  const handleStampPlace = useCallback((nodeId: string) => {
    if (!stampPattern) return;
    const targetBead = beads.find(b => b.id === nodeId);
    if (!targetBead) return;
    const patch = applyLoomStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx);
    if (Object.keys(patch).length === 0) return;

    drawingControls.remapDesignMap(prev => {
      const next = { ...prev, ...patch };
      if (mirrorMode) {
        for (const [id, color] of Object.entries(patch)) {
          const m = mirrorLoomBeadId(id, gridSize.width);
          if (m !== null && m !== id) next[m] = color;
        }
      }
      return next;
    });
  }, [stampPattern, beads, stampCtx, drawingControls, mirrorMode, gridSize.width]);

  // --- Сетка --------------------------------------------------------------
  const applyWidth = (result: WidthResizeResult | null, wasMirror: boolean) => {
    if (!result) return;
    const { newWidth, mirrorDelta } = result;
    if (wasMirror) {
      drawingControls.remapDesignMap(map =>
        shiftLoomDesignMapColumns(map, mirrorDelta, newWidth),
      );
    }
    setGridSize(prev => ({ ...prev, width: newWidth }));
  };

  const updateDimension = (field: 'width' | 'height', delta: number) => {
    if (field === 'width') {
      applyWidth(resizeWidthRelative(gridSize.width, delta, mirrorMode, APP_CONSTRAINTS.maxGridWidth), mirrorMode);
      return;
    }
    const newVal = clamp(gridSize.height + delta, 1, APP_CONSTRAINTS.maxGridHeight);
    setGridSize(prev => ({ ...prev, height: newVal }));
  };

  const setWidthAbsolute = (v: number) => {
    applyWidth(resizeWidthAbsolute(gridSize.width, v, mirrorMode, APP_CONSTRAINTS.maxGridWidth), mirrorMode);
  };

  const setHeightAbsolute = (v: number) => {
    setGridSize(prev => ({ ...prev, height: clamp(Math.round(v), 1, APP_CONSTRAINTS.maxGridHeight) }));
  };

  const updateSpacing = (delta: number) => {
    const { minSpacing, maxSpacing } = LOOM_THEME.constraints;
    setGridSize(prev => ({ ...prev, pitchX: clamp(prev.pitchX + delta, minSpacing, maxSpacing) }));
  };

  const setSpacingAbsolute = (v: number) => {
    const { minSpacing, maxSpacing } = LOOM_THEME.constraints;
    setGridSize(prev => ({ ...prev, pitchX: clamp(Math.round(v), minSpacing, maxSpacing) }));
  };

  const gridIsDefault = (
    gridSize.width === LOOM_THEME.gridDefaults.initialWidth &&
    gridSize.height === LOOM_THEME.gridDefaults.initialHeight &&
    gridSize.pitchX === LOOM_THEME.gridDefaults.spacing
  );

  const resetGridAll = () => {
    setGridSize({
      width: LOOM_THEME.gridDefaults.initialWidth,
      height: LOOM_THEME.gridDefaults.initialHeight,
      pitchX: LOOM_THEME.gridDefaults.spacing,
    });
  };

  return {
    gridSize, beads, drawingControls, weave,
    mirrorMode, setMirrorMode,
    updateDimension, setWidthAbsolute, setHeightAbsolute,
    updateSpacing, setSpacingAbsolute,
    handleFloodFill, makeSymmetric, resetGridAll, gridIsDefault,
    stampPattern, setStampPattern, stampHoverNodeId, setStampHoverNodeId, stampPreviewPatch,
    handleStampSelect, handleStampPlace,
  };
};

export type LoomProject = ReturnType<typeof useLoomProject>;
