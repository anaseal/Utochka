import { Dispatch, SetStateAction, useCallback } from 'react';
import { usePersistedState } from './usePersistedState';
import { BEAD_THEME } from '../config/theme';
import { BottomEdgeDecor, EdgeExtension, GridConfig, Taper } from '../types/bead';
import { PendantPlacement, PendantChain, DecorTailPlacement } from '../types/pendant';
import { clampSpan, resolveSpanCount } from '../utils/spans';
import { clamp } from '../utils/clamp';
import { resizeWidthAbsolute, resizeWidthRelative, WidthResizeResult } from '../utils/gridResize';
import { shiftDesignMapColumns } from '../utils/regrid';
import {
  isGridConfig, isBottomEdgeDecor, isEdgeExtension, isTaper, isRowSpanOverrides, isDecorBands,
  taperRowsMax, taperDepthMax, clampTaperSide, clampTaperDepth, MAX_RAW_WIDTH, MAX_RAW_HEIGHT,
  pruneRedundantOverrides, pruneRowsBelow,
} from './useSilyankaProject.validators';

// Геометрия сетки: размеры, спаны, скос, края — и все обработчики, которые их
// меняют. Вынесено из useSilyankaProject.ts тем же приёмом, что usePendants/
// usePendantChains/useDecorTails: свой срез persisted-состояния + свои
// обработчики. pendant/chain/decorTail сеттеры и placements нужны только
// внутри applyWidth/toggleBottomEdgeEnabled — их каскадные эффекты при
// resize и пересечение с Bottom Chain (см. комментарии ниже).
export const useGridConfig = (
  pendantPlacements: PendantPlacement[],
  setPendantPlacements: Dispatch<SetStateAction<PendantPlacement[]>>,
  setPendantChains: Dispatch<SetStateAction<PendantChain[]>>,
  decorTailPlacements: DecorTailPlacement[],
  setDecorTailPlacements: Dispatch<SetStateAction<DecorTailPlacement[]>>,
  remapDesignMap: (fn: (map: Record<string, string>) => Record<string, string>) => void,
) => {
  const [gridSize, setGridSize] = usePersistedState<GridConfig>('silyanka:gridSize', {
    width: BEAD_THEME.gridDefaults.initialWidth,
    height: BEAD_THEME.gridDefaults.initialHeight,
    spacing: BEAD_THEME.gridDefaults.spacing,
    topSpan: BEAD_THEME.gridDefaults.beadsInSpan,
    bottomSpan: BEAD_THEME.gridDefaults.beadsInSpan,
  }, isGridConfig);

  const [rowSpanOverrides, setRowSpanOverrides] = usePersistedState<Record<number, number>>(
    'silyanka:rowSpanOverrides', {}, isRowSpanOverrides,
  );
  const [mirrorMode, setMirrorMode] = usePersistedState<boolean>(
    'silyanka:mirrorMode', false, (v): v is boolean => typeof v === 'boolean',
  );
  const [decorBands, setDecorBands] = usePersistedState<Record<number, number>>(
    'silyanka:decorBands', {}, isDecorBands,
  );
  const [bottomEdgeDecor, setBottomEdgeDecor] = usePersistedState<BottomEdgeDecor>(
    'silyanka:bottomEdgeDecor',
    { enabled: false },
    isBottomEdgeDecor,
  );
  const [edgeExtension, setEdgeExtension] = usePersistedState<EdgeExtension>(
    'silyanka:edgeExtension',
    { left: true, right: true },
    isEdgeExtension,
  );
  // По умолчанию включена — в отличие от Bottom Chain, верхняя цепочка была
  // частью геометрии всегда, тумблер лишь позволяет её убрать.
  const [topEdgeEnabled, setTopEdgeEnabled] = usePersistedState<boolean>(
    'silyanka:topEdgeEnabled', true, (v): v is boolean => typeof v === 'boolean',
  );
  const [taper, setTaper] = usePersistedState<Taper>(
    'silyanka:taper',
    { top: { rows: 0 }, bottom: { rows: 0 }, depth: 0 },
    isTaper,
  );
  // Синхронизация Rows между top/bottom — по умолчанию выключена, каждая
  // сторона независима (см. spec.md, «Сужение концов»).
  const [taperRowsLinked, setTaperRowsLinked] = usePersistedState<boolean>(
    'silyanka:taperRowsLinked', false, (v): v is boolean => typeof v === 'boolean',
  );

  // Общий обработчик результата resizeWidthRelative/resizeWidthAbsolute:
  // сдвиг designMap в Mirror Mode, снятие подвесок с исчезнувших/сдвинутых
  // колонок (только у силянки — у CrossWeave подвесок нет) и запись gridSize.
  const applyWidth = (result: WidthResizeResult | null, wasMirror: boolean) => {
    if (!result) return;
    const { newWidth, mirrorDelta } = result;
    if (wasMirror) {
      remapDesignMap(map =>
        shiftDesignMapColumns(map, mirrorDelta, newWidth, edgeExtension.left, edgeExtension.right),
      );
      // Подвески сдвигаем вместе с рисунком, иначе их col отвяжется от нод.
      setPendantPlacements(prev => prev
        .map(p => ({ ...p, col: p.col + mirrorDelta }))
        .filter(p => p.col >= 0 && p.col < newWidth));
      // Цепочки сдвигаем целиком по обоим концам; если один конец вышел за
      // границу — цепочка теряет якорь и удаляется целиком.
      setPendantChains(prev => prev
        .map(c => ({ ...c, startCol: c.startCol + mirrorDelta, endCol: c.endCol + mirrorDelta }))
        .filter(c => c.startCol >= 0 && c.endCol < newWidth));
      // Декор-хвосты сдвигаем вместе с рисунком той же логикой, что и подвески.
      setDecorTailPlacements(prev => prev
        .map(t => ({ ...t, col: t.col + mirrorDelta }))
        .filter(t => t.col >= 0 && t.col < newWidth));
    } else if (newWidth < gridSize.width) {
      // При сужении сетки убираем подвески/цепочки/хвосты с исчезнувших колонок.
      setPendantPlacements(prev => prev.filter(p => p.col < newWidth));
      setPendantChains(prev => prev.filter(c => c.startCol < newWidth && c.endCol < newWidth));
      setDecorTailPlacements(prev => prev.filter(t => t.col < newWidth));
    }
    // Потолок Taper.depth зависит от ширины — подрезаем так же, как rows
    // подрезаются под высоту (см. applyHeight), иначе на узкой сетке остаётся
    // depth, который давно упёрся в клэмп и не отражает картинку.
    setTaper(prev => ({ ...prev, depth: clampTaperDepth(prev.depth, newWidth) }));
    setGridSize(prev => ({ ...prev, width: newWidth }));
  };

  // При уменьшении высоты убираем декор-полосы с исчезнувших рядов и
  // подрезаем Taper.rows под новый максимум (см. clampTaperSide).
  const applyHeight = (newH: number) => {
    if (newH === gridSize.height) return;
    if (newH < gridSize.height) {
      setDecorBands(prev => pruneRowsBelow(prev, 2 * newH));
    }
    setTaper(prev => ({
      ...prev,
      top: clampTaperSide(prev.top, newH),
      bottom: clampTaperSide(prev.bottom, newH),
    }));
    setGridSize(prev => ({ ...prev, height: newH }));
  };

  // Общий обработчик top/bottom span: пишет gridSize и чистит устаревшие
  // per-row overrides, совпавшие с новым глобальным дефолтом.
  const applySpanEdge = (edge: 'topSpan' | 'bottomSpan', newVal: number) => {
    if (newVal === gridSize[edge]) return;
    setGridSize(prev => ({ ...prev, [edge]: newVal }));
    setRowSpanOverrides(prev => pruneRedundantOverrides(
      prev,
      edge === 'topSpan' ? newVal : gridSize.topSpan,
      edge === 'bottomSpan' ? newVal : gridSize.bottomSpan,
    ));
  };

  const updateDimension = (field: 'width' | 'height', delta: number) => {
    if (field === 'width') {
      applyWidth(resizeWidthRelative(gridSize.width, delta, mirrorMode, MAX_RAW_WIDTH), mirrorMode);
      return;
    }
    applyHeight(clamp(gridSize.height + delta, 1, MAX_RAW_HEIGHT));
  };

  const updateTopSpan = (delta: number) => {
    applySpanEdge('topSpan', clampSpan(gridSize.topSpan + delta));
  };

  const updateBottomSpan = (delta: number) => {
    applySpanEdge('bottomSpan', clampSpan(gridSize.bottomSpan + delta));
  };

  const updateTaperRows = (edge: 'top' | 'bottom', delta: number) => {
    setTaper(prev => {
      const nextSide = clampTaperSide({ rows: prev[edge].rows + delta }, gridSize.height);
      return taperRowsLinked
        ? { ...prev, top: nextSide, bottom: nextSide }
        : { ...prev, [edge]: nextSide };
    });
  };

  const toggleTaperRowsLinked = () => {
    // Побочный эффект (setTaper) — здесь, в обработчике, а не внутри апдейтера
    // setTaperRowsLinked: React (StrictMode) может вызвать апдейтер дважды,
    // и setState изнутри чужого апдейтера — источник трудноуловимых багов.
    const turningOn = !taperRowsLinked;
    setTaperRowsLinked(turningOn);
    // Включение синка сразу выравнивает стороны, иначе «синхронно» вводит в
    // заблуждение, пока обе стороны не станут равны следующим изменением.
    // Равняем по БОЛЬШЕЙ из двух: копирование top в bottom молча стирало
    // настроенную нижнюю сторону (в истории Undo параметров сетки нет,
    // вернуть было нечем), а так ни одна сторона не пропадает — видно сразу,
    // и откатывается тем же степпером.
    if (turningOn) {
      setTaper(prev => {
        const rows = Math.max(prev.top.rows, prev.bottom.rows);
        return { ...prev, top: { rows }, bottom: { rows } };
      });
    }
  };

  const updateTaperDepth = (delta: number) => {
    setTaper(prev => ({ ...prev, depth: clampTaperDepth(prev.depth + delta, gridSize.width) }));
  };

  const updateSpacing = (delta: number) => {
    const { minSpacing, maxSpacing } = BEAD_THEME.constraints;
    setGridSize(prev => ({
      ...prev,
      spacing: clamp(prev.spacing + delta, minSpacing, maxSpacing),
    }));
  };

  const setWidthAbsolute = (v: number) => {
    applyWidth(resizeWidthAbsolute(gridSize.width, v, mirrorMode, MAX_RAW_WIDTH), mirrorMode);
  };

  const setHeightAbsolute = (v: number) => {
    applyHeight(clamp(Math.round(v), 1, MAX_RAW_HEIGHT));
  };

  const setTopSpanAbsolute = (v: number) => {
    applySpanEdge('topSpan', clampSpan(Math.round(v)));
  };

  const setBottomSpanAbsolute = (v: number) => {
    applySpanEdge('bottomSpan', clampSpan(Math.round(v)));
  };

  const setTaperRowsAbsolute = (edge: 'top' | 'bottom', v: number) => {
    setTaper(prev => {
      const nextSide = clampTaperSide({ rows: Math.round(v) }, gridSize.height);
      return taperRowsLinked
        ? { ...prev, top: nextSide, bottom: nextSide }
        : { ...prev, [edge]: nextSide };
    });
  };

  const setTaperDepthAbsolute = (v: number) => {
    setTaper(prev => ({ ...prev, depth: clampTaperDepth(Math.round(v), gridSize.width) }));
  };

  const resetTaperSide = (edge: 'top' | 'bottom') => {
    setTaper(prev => taperRowsLinked
      ? { ...prev, top: { rows: 0 }, bottom: { rows: 0 } }
      : { ...prev, [edge]: { rows: 0 } });
  };

  const resetTaperDepth = () => {
    setTaper(prev => ({ ...prev, depth: 0 }));
  };

  const setSpacingAbsolute = (v: number) => {
    const { minSpacing, maxSpacing } = BEAD_THEME.constraints;
    setGridSize(prev => ({
      ...prev,
      spacing: clamp(Math.round(v), minSpacing, maxSpacing),
    }));
  };

  const toggleBottomEdgeEnabled = () => {
    setBottomEdgeDecor(prev => {
      // Bottom Chain, подвески и декор-хвосты не могут быть включены
      // одновременно — все три стартуют от той же ноды нижнего ряда, которую
      // трогает дуга Bottom Chain (см. spec.md, «Взаимоисключение с подвесками»).
      if (!prev.enabled && (pendantPlacements.length > 0 || decorTailPlacements.length > 0)) return prev;
      return { ...prev, enabled: !prev.enabled };
    });
  };

  const toggleTopEdgeEnabled = () => {
    setTopEdgeEnabled(prev => !prev);
  };

  const toggleExtendLeftEdge = () => {
    setEdgeExtension(prev => ({ ...prev, left: !prev.left }));
  };

  const toggleExtendRightEdge = () => {
    setEdgeExtension(prev => ({ ...prev, right: !prev.right }));
  };

  // useCallback: без него функция получала бы новую ссылку на каждый
  // рендер useSilyankaProject (т.е. от любого клика где угодно в
  // приложении) — а это проп BeadGrid (onRowSpanChange), и нестабильная
  // ссылка пробивала бы его memo, пересобирая весь список из тысяч бисерин
  // на совершенно не связанные действия. Обслуживает и обычные ряды, и
  // горизонтальные цепочки (r=-1 Top Chain, r=-2 Bottom Chain) — они лежат
  // в тех же rowSpanOverrides (см. resolveSpanCount).
  const updateRowSpan = useCallback((spanRowIndex: number, delta: number) => {
    setRowSpanOverrides(prev => {
      const current = resolveSpanCount(spanRowIndex, gridSize.topSpan, gridSize.bottomSpan, prev);
      const newVal = clampSpan(current + delta);
      if (newVal === current) return prev;
      const globalDefault = resolveSpanCount(spanRowIndex, gridSize.topSpan, gridSize.bottomSpan, {});
      if (newVal === globalDefault) {
        const next = { ...prev };
        delete next[spanRowIndex];
        return next;
      }
      return { ...prev, [spanRowIndex]: newVal };
    });
  }, [setRowSpanOverrides, gridSize.topSpan, gridSize.bottomSpan]);

  // Промежуточный декор: ± меняет число рядов полосы между узловым рядом r и r+1.
  // 0 (ниже minRows) — полоса удаляется.
  const updateDecorBand = (r: number, delta: number) => {
    setDecorBands(prev => {
      const current = prev[r] ?? 0;
      const next = current + delta;
      const copy = { ...prev };
      if (next < BEAD_THEME.decorDefaults.minRows) {
        delete copy[r];
      } else {
        copy[r] = Math.min(next, BEAD_THEME.decorDefaults.maxRows);
      }
      return copy;
    });
  };

  const handleDecorDrop = (nodeRow: number) => {
    setDecorBands(prev => {
      const copy = { ...prev };
      if ((copy[nodeRow] ?? 0) > 0) {
        delete copy[nodeRow];
      } else {
        copy[nodeRow] = BEAD_THEME.decorDefaults.minRows;
      }
      return copy;
    });
  };

  const handleClearDecor = () => {
    setDecorBands({});
  };

  // «Reset all» панели Grid — возвращает геометрию (не рисунок/декор/подвески,
  // у тех свой Reset all в Pendants & Decor) к дефолтам первого запуска.
  const gridIsDefault = (
    gridSize.width === BEAD_THEME.gridDefaults.initialWidth &&
    gridSize.height === BEAD_THEME.gridDefaults.initialHeight &&
    gridSize.spacing === BEAD_THEME.gridDefaults.spacing &&
    gridSize.topSpan === BEAD_THEME.gridDefaults.beadsInSpan &&
    gridSize.bottomSpan === BEAD_THEME.gridDefaults.beadsInSpan &&
    Object.keys(rowSpanOverrides).length === 0 &&
    taper.top.rows === 0 && taper.bottom.rows === 0 && taper.depth === 0 &&
    !taperRowsLinked &&
    topEdgeEnabled &&
    !bottomEdgeDecor.enabled &&
    edgeExtension.left && edgeExtension.right
  );

  const resetGridAll = () => {
    setGridSize({
      width: BEAD_THEME.gridDefaults.initialWidth,
      height: BEAD_THEME.gridDefaults.initialHeight,
      spacing: BEAD_THEME.gridDefaults.spacing,
      topSpan: BEAD_THEME.gridDefaults.beadsInSpan,
      bottomSpan: BEAD_THEME.gridDefaults.beadsInSpan,
    });
    setRowSpanOverrides({});
    setTaper({ top: { rows: 0 }, bottom: { rows: 0 }, depth: 0 });
    setTaperRowsLinked(false);
    setTopEdgeEnabled(true);
    setBottomEdgeDecor({ enabled: false });
    setEdgeExtension({ left: true, right: true });
  };

  const resetEdge = (edge: 'top' | 'bottom') => {
    const isTop = edge === 'top';
    setGridSize(prev => ({
      ...prev,
      [isTop ? 'topSpan' : 'bottomSpan']: BEAD_THEME.gridDefaults.beadsInSpan,
    }));
    setRowSpanOverrides(prev => {
      const next: Record<number, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        const isEvenRow = Number(k) % 2 === 0;
        const belongsToEdge = isTop ? !isEvenRow : isEvenRow;
        if (!belongsToEdge) next[Number(k)] = v;
      }
      return next;
    });
  };

  return {
    gridSize, rowSpanOverrides, mirrorMode, setMirrorMode, decorBands, bottomEdgeDecor,
    edgeExtension, toggleExtendLeftEdge, toggleExtendRightEdge,
    topEdgeEnabled, toggleTopEdgeEnabled,
    taper, updateTaperRows, setTaperRowsAbsolute, resetTaperSide,
    updateTaperDepth, setTaperDepthAbsolute, resetTaperDepth,
    taperRowsMax: taperRowsMax(gridSize.height),
    taperDepthMax: taperDepthMax(gridSize.width),
    taperRowsLinked, toggleTaperRowsLinked,
    updateDimension, updateTopSpan, updateBottomSpan, updateSpacing,
    setWidthAbsolute, setHeightAbsolute, setTopSpanAbsolute, setBottomSpanAbsolute, setSpacingAbsolute,
    toggleBottomEdgeEnabled, updateRowSpan,
    updateDecorBand, handleDecorDrop, handleClearDecor,
    resetEdge, resetGridAll, gridIsDefault,
  };
};
