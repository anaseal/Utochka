import { useCallback, useMemo, useState } from 'react';
import { useDrawing } from './useDrawing';
import { usePersistedState } from './usePersistedState';
import { PEYOTE_THEME, defaultColorForPeyote, pitchYFromX } from '../config/peyoteTheme';
import { APP_CONSTRAINTS } from '../config/theme';
import { PeyoteGridConfig } from '../types/peyoteBead';
import { PendantPlacement, PendantChain, DecorTailPlacement, ToothPlacement } from '../types/pendant';
import { Thread } from '../types/thread';
import { generatePeyoteGrid } from '../utils/peyoteGenerator';
import { mirrorPeyoteBeadId, shiftPeyoteDesignMapColumns } from '../utils/peyoteMirror';
import { computePeyoteFloodFill } from '../utils/peyoteFloodFill';
import {
  PeyoteStampPattern, PeyoteStampContext, capturePeyoteStampPattern, applyPeyoteStampPattern,
} from '../utils/peyoteStamp';
import { fillMissingMirror } from '../utils/symmetrize';
import { clamp } from '../utils/clamp';
import { resizeWidthAbsolute, resizeWidthRelative, WidthResizeResult } from '../utils/gridResize';
import { isIntInRange } from './useSilyankaProject.validators';

// Peyote не поддерживает подвески, цепочки, декор-хвосты, зубцы И нитку
// (MVP, см. spec.md, «Peyote») — стабильные пустые ссылки и no-op сеттеры,
// чтобы useDrawing не считал их «изменившимися» на каждый рендер. В отличие
// от CrossWeave, у Peyote заглушена и нитка — там инструментов рисования
// ровно пять (карандаш/ластик/заливка/штамп/зеркало), без трассировки нити.
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

const isPeyoteGridConfig = (v: unknown): v is PeyoteGridConfig => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  const { minSpacing, maxSpacing } = PEYOTE_THEME.constraints;
  return isIntInRange(obj.width, 1, APP_CONSTRAINTS.maxGridWidth) &&
    isIntInRange(obj.height, 1, APP_CONSTRAINTS.maxGridHeight) &&
    isIntInRange(obj.pitchX, minSpacing, maxSpacing);
};

// Состояние и обработчики Peyote — независимый MVP-проект, геометрически
// ближе к crossWeave (одна физическая бисерина на позицию решётки, без
// node/span), но без raw/logical различия размеров: у Peyote все ряды одной
// ширины, поэтому gridSize.width/height — это сразу и то, что генерирует
// generatePeyoteGrid, и то, что подписывает PeyoteRulers (см. spec.md).
export const usePeyoteProject = (palette: readonly string[]) => {
  const [gridSize, setGridSize] = usePersistedState<PeyoteGridConfig>('peyote:gridSize', {
    width: PEYOTE_THEME.gridDefaults.initialWidth,
    height: PEYOTE_THEME.gridDefaults.initialHeight,
    pitchX: PEYOTE_THEME.gridDefaults.spacing,
  }, isPeyoteGridConfig);

  const [mirrorMode, setMirrorMode] = usePersistedState<boolean>(
    'peyote:mirrorMode', false, (v): v is boolean => typeof v === 'boolean',
  );

  // pitchY выводится из pitchX — см. pitchYFromX в config/peyoteTheme.ts,
  // единственный источник правды (не хранится отдельным полем состояния).
  const beads = useMemo(
    () => generatePeyoteGrid(gridSize.width, gridSize.height, gridSize.pitchX, pitchYFromX(gridSize.pitchX)),
    [gridSize.width, gridSize.height, gridSize.pitchX],
  );

  const drawingControls = useDrawing(
    palette[0], palette, EMPTY_PENDANT_PLACEMENTS, noopSetPendantPlacements,
    EMPTY_PENDANT_CHAINS, noopSetPendantChains,
    EMPTY_DECOR_TAIL_PLACEMENTS, noopSetDecorTailPlacements,
    EMPTY_TEETH, noopSetTeeth, EMPTY_THREADS, noopSetThreads, 'peyote',
  );

  // Заливка: BFS по графу физической смежности бисерин (см.
  // peyoteFloodFill.ts) — своя, отдельная от crossWeave/силяночной, т.к. тут
  // другая геометрия соседства. В Mirror Mode заливка выполняется и для
  // зеркальной бисерины, оба результата уходят в один снимок истории.
  const handleFloodFill = useCallback((startId: string) => {
    const ids = new Set(computePeyoteFloodFill(
      startId, beads, drawingControls.designMap, drawingControls.activeColor, defaultColorForPeyote(),
    ));

    if (mirrorMode) {
      const mirrorStartId = mirrorPeyoteBeadId(startId, gridSize.width);
      if (mirrorStartId && mirrorStartId !== startId) {
        for (const id of computePeyoteFloodFill(
          mirrorStartId, beads, drawingControls.designMap, drawingControls.activeColor, defaultColorForPeyote(),
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

  // Ретроактивная симметризация — тот же смысл, что и у силянки/crossWeave
  // (см. useSilyankaProject.makeSymmetric), но по формуле mirrorPeyoteBeadId.
  const makeSymmetric = useCallback(() => {
    drawingControls.remapDesignMap(map => fillMissingMirror(
      map,
      id => mirrorPeyoteBeadId(id, gridSize.width),
    ));
  }, [drawingControls, gridSize.width]);

  // --- Штамп ------------------------------------------------------------
  // Тот же блок состояния, что у силянки (useSilyankaProject.ts, стр.
  // 242–395), но без stampAnchorEdge — у Peyote нет top/bottom-структуры
  // узора, якорь штампа всегда левый верхний угол выделения (см.
  // peyoteStamp.ts).
  const [stampPattern, setStampPattern] = useState<PeyoteStampPattern | null>(null);
  const [stampHoverNodeId, setStampHoverNodeId] = useState<string | null>(null);

  const stampCtx = useMemo<PeyoteStampContext>(() => ({
    width: gridSize.width,
    height: gridSize.height,
  }), [gridSize.width, gridSize.height]);

  const stampPreviewPatch = useMemo<Record<string, string> | null>(() => {
    if (!stampPattern || !stampHoverNodeId) return null;
    const targetBead = beads.find(b => b.id === stampHoverNodeId);
    if (!targetBead) return null;
    return applyPeyoteStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx);
  }, [stampPattern, stampHoverNodeId, beads, stampCtx]);

  const handleStampSelect = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const pattern = capturePeyoteStampPattern(ids, drawingControls.designMap);
    if (pattern.entries.length === 0) return;
    setStampPattern(pattern);
    setStampHoverNodeId(null);
  }, [drawingControls.designMap]);

  const handleStampPlace = useCallback((nodeId: string) => {
    if (!stampPattern) return;
    const targetBead = beads.find(b => b.id === nodeId);
    if (!targetBead) return;
    const patch = applyPeyoteStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx);
    if (Object.keys(patch).length === 0) return;

    drawingControls.remapDesignMap(prev => {
      const next = { ...prev, ...patch };
      if (mirrorMode) {
        for (const [id, color] of Object.entries(patch)) {
          const m = mirrorPeyoteBeadId(id, gridSize.width);
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
        shiftPeyoteDesignMapColumns(map, mirrorDelta, newWidth),
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
    const { minSpacing, maxSpacing } = PEYOTE_THEME.constraints;
    setGridSize(prev => ({ ...prev, pitchX: clamp(prev.pitchX + delta, minSpacing, maxSpacing) }));
  };

  const setSpacingAbsolute = (v: number) => {
    const { minSpacing, maxSpacing } = PEYOTE_THEME.constraints;
    setGridSize(prev => ({ ...prev, pitchX: clamp(Math.round(v), minSpacing, maxSpacing) }));
  };

  const gridIsDefault = (
    gridSize.width === PEYOTE_THEME.gridDefaults.initialWidth &&
    gridSize.height === PEYOTE_THEME.gridDefaults.initialHeight &&
    gridSize.pitchX === PEYOTE_THEME.gridDefaults.spacing
  );

  const resetGridAll = () => {
    setGridSize({
      width: PEYOTE_THEME.gridDefaults.initialWidth,
      height: PEYOTE_THEME.gridDefaults.initialHeight,
      pitchX: PEYOTE_THEME.gridDefaults.spacing,
    });
  };

  return {
    gridSize, beads, drawingControls,
    mirrorMode, setMirrorMode,
    updateDimension, setWidthAbsolute, setHeightAbsolute,
    updateSpacing, setSpacingAbsolute,
    handleFloodFill, makeSymmetric, resetGridAll, gridIsDefault,
    stampPattern, setStampPattern, stampHoverNodeId, setStampHoverNodeId, stampPreviewPatch,
    handleStampSelect, handleStampPlace,
  };
};

export type PeyoteProject = ReturnType<typeof usePeyoteProject>;
