import { useCallback, useMemo, useRef, useState, SetStateAction } from 'react';
import { useGrid } from './useGrid';
import { useDrawing } from './useDrawing';
import { usePendants, findMirrorPendant } from './usePendants';
import { usePendantChains, findMirrorChain } from './usePendantChains';
import { useDecorTails } from './useDecorTails';
import { useTeeth } from './useTeeth';
import { useThreads } from './useThreads';
import { useWeaveProgress } from './useWeaveProgress';
import { usePersistedState } from './usePersistedState';
import { useGridConfig } from './useGridConfig';
import { THREAD_STRAND_DEFAULT_COLORS, DEFAULT_THREAD_OPACITY } from '../config/theme';
import {
  PendantPlacement, PendantChain, DecorTailPlacement, ToothPlacement, ChainEndpoint, PendantAnchor,
} from '../types/pendant';
import { Thread } from '../types/thread';
import { PENDANT_TEMPLATES_BY_ID } from '../data/pendantTemplates';
import { mirrorBeadId } from '../utils/mirror';
import { resolveSpanCount } from '../utils/spans';
import { fillMissingMirror } from '../utils/symmetrize';
import { computeUnifiedFloodFill, pendantBeadId } from '../utils/floodFill';
import { chainBeadId, chainEndpointsEqual } from '../utils/pendantChain';
import { decorTailBeadId } from '../utils/decorTail';
import { toothBeadId, computeToothMeshes, computeToothInsertionRanges } from '../utils/tooth';
import { getDecorRowStep } from '../utils/decorGeometry';
import { buildSegmentIndex, silyankaNodeSpans } from '../utils/weaveSegment';
import {
  StampPattern, StampContext, StampAnchorEdge, captureStampPattern, applyStampPattern,
} from '../utils/stamp';
import {
  isPendantPlacements, isPendantChains, isDecorTailPlacements, isTeeth, isThreads, isHexColor,
  isOpacity, isDeletedBeads, normalizePendantPlacements,
} from './useSilyankaProject.validators';

// Всё силяночное состояние и обработчики, вынесенные из App.tsx, чтобы
// хостить вторую независимую технику (крестик) без дублирования ~400 строк.
// Геометрия сетки (размеры/спаны/скос/края) вынесена в useGridConfig —
// см. комментарий там же.
export const useSilyankaProject = (palette: readonly string[]) => {
  const [rawPendantPlacements, setRawPendantPlacements] = usePersistedState<PendantPlacement[]>(
    'silyanka:pendantPlacements', [], isPendantPlacements,
  );
  // Раньше подвеска хранила плоский col — теперь anchor:{kind:'grid'|'tooth',
  // ...} (см. types/pendant.ts, «Зубец» в spec.md). normalizePendantPlacements
  // переносит старые записи в новый формат; обёрнутый сеттер прогоняет через
  // неё и prev (для функциональных апдейтов), и итоговое значение (для
  // прямой записи — так восстанавливается снимок истории Undo/Redo,
  // см. useDrawing.ts) — все потребители ниже (usePendants, floodFill,
  // рендер) видят только anchor-форму, независимо от того, что реально
  // лежит в localStorage/файле проекта/истории на момент запуска.
  const pendantPlacements = useMemo(
    () => normalizePendantPlacements(rawPendantPlacements), [rawPendantPlacements],
  );
  const setPendantPlacements = useCallback((action: SetStateAction<PendantPlacement[]>) => {
    setRawPendantPlacements((prev) => {
      const normalizedPrev = normalizePendantPlacements(prev);
      const next = typeof action === 'function'
        ? (action as (p: PendantPlacement[]) => PendantPlacement[])(normalizedPrev)
        : action;
      return normalizePendantPlacements(next);
    });
  }, [setRawPendantPlacements]);

  const [pendantChains, setPendantChains] = usePersistedState<PendantChain[]>(
    'silyanka:pendantChains', [], isPendantChains,
  );

  const [decorTailPlacements, setDecorTailPlacements] = usePersistedState<DecorTailPlacement[]>(
    'silyanka:decorTailPlacements', [], isDecorTailPlacements,
  );

  const [teeth, setTeeth] = usePersistedState<ToothPlacement[]>(
    'silyanka:teeth', [], isTeeth,
  );

  const [threads, setThreads] = usePersistedState<Thread[]>(
    'silyanka:threads', [], isThreads,
  );

  const drawingControls = useDrawing(
    palette[0], palette, pendantPlacements, setPendantPlacements,
    pendantChains, setPendantChains, decorTailPlacements, setDecorTailPlacements,
    teeth, setTeeth, threads, setThreads, 'silyanka',
  );

  const gridConfig = useGridConfig(
    pendantPlacements, setPendantPlacements, setPendantChains,
    decorTailPlacements, setDecorTailPlacements, teeth, setTeeth, drawingControls.remapDesignMap,
  );
  const {
    gridSize, rowSpanOverrides, mirrorMode, decorBands, bottomEdgeDecor,
    edgeExtension, topEdgeEnabled, taper,
  } = gridConfig;

  const rawBeads = useGrid(gridSize, rowSpanOverrides, decorBands, bottomEdgeDecor, edgeExtension, topEdgeEnabled, taper);

  // Число внутренних бисерин верхней/нижней кромки — чистая производная от
  // геометрии сетки (ни от beads, ни от рисунка не зависит), поэтому стоит
  // сразу за gridConfig: ниже на них опирается mirrorIdOf, а он нужен уже
  // инструменту «Дыра» (см. mirrorPendingId).
  const internalTop = topEdgeEnabled
    ? Math.max(0, resolveSpanCount(-1, gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides) - 2)
    : 0;

  const internalBottom = Math.max(
    0, resolveSpanCount(-2, gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides) - 2,
  );

  // Зеркальная пара бисерины по текущей геометрии — единственное место, где
  // связывается весь набор аргументов mirrorBeadId. Ниже им пользуются штамп,
  // заливка, «Сделать симметричным» и «Дыра».
  const mirrorIdOf = useCallback(
    (id: string) => mirrorBeadId(
      id, gridSize.width, internalTop, internalBottom, edgeExtension.left, edgeExtension.right,
    ),
    [gridSize.width, internalTop, internalBottom, edgeExtension],
  );

  // Дыра (инструмент GridSidebar): id -> true для бисерин, удалённых кликом.
  // Структурная правка уровня генератора (как taper/rowSpanOverrides) — не
  // часть Undo/Redo рисования и не сбрасывается Clear All, переживает их так
  // же, как и остальная геометрия сетки.
  const [deletedBeads, setDeletedBeads] = usePersistedState<Record<string, true>>(
    'silyanka:deletedBeads', {}, isDeletedBeads,
  );

  const beads = useMemo(
    () => rawBeads.filter(b => !deletedBeads[b.id]),
    [rawBeads, deletedBeads],
  );

  // Для дизейбла кнопки «Restore all» в HolesSection — сами удалённые
  // бисерины больше не рендерятся (см. confirmPendingDelete ниже), поэтому
  // достаточно факта, что список непуст.
  const hasDeletedBeads = useMemo(
    () => Object.keys(deletedBeads).length > 0,
    [deletedBeads],
  );

  const clearDeletedBeads = useCallback(() => {
    setDeletedBeads({});
  }, [setDeletedBeads]);

  // Инструмент «Hole segment» (GridSidebar, «Holes»): клик по ноде удаляет её
  // саму и все физически сходящиеся к ней спаны разом (см. silyankaNodeSpans,
  // weaveSegment.ts) — вместо выковыривания грани за гранью инструментом Hole.
  // beadById — общий индекс для поиска бисерины по id и (в CanvasView) для
  // «липкой» проверки при наведении, чтобы не строить Map дважды на одно и то
  // же beads.
  const beadById = useMemo(() => new Map(beads.map(b => [b.id, b])), [beads]);
  const holeSegmentIndex = useMemo(() => buildSegmentIndex(beads), [beads]);

  const getHoleSegmentIds = useCallback((nodeId: string): string[] => {
    const bead = beadById.get(nodeId);
    if (!bead || bead.type !== 'NODE') return [];
    const spans = silyankaNodeSpans(
      bead.logicalIndex.row, bead.logicalIndex.col, holeSegmentIndex,
      { bottomRow: 2 * gridSize.height },
    );
    return [nodeId, ...spans];
  }, [beadById, holeSegmentIndex, gridSize.height]);

  // Зеркальная пара для «Дыры»: в Mirror Mode клик выкусывает бисерину (или
  // сегмент) сразу с обеих сторон оси — так же, как зеркалятся карандаш,
  // заливка и штамп. Пара проверяется по beadById, а не берётся у mirrorIdOf
  // на веру: скос (Taper) или уже удалённая бисерина могли срезать её, а
  // пометка несуществующего id накрутила бы счётчик «Delete N beads» и молча
  // осела бы в deletedBeads.
  const mirrorPendingId = useCallback((id: string): string | null => {
    if (!mirrorMode) return null;
    const m = mirrorIdOf(id);
    return m !== null && m !== id && beadById.has(m) ? m : null;
  }, [mirrorMode, mirrorIdOf, beadById]);

  const [holeSegmentHoverNodeId, setHoleSegmentHoverNodeId] = useState<string | null>(null);

  const holeSegmentPreviewIds = useMemo<Set<string> | null>(() => {
    if (!holeSegmentHoverNodeId) return null;
    const ids = getHoleSegmentIds(holeSegmentHoverNodeId);
    // Предпросмотр показывает ровно то, что уйдёт по клику, — включая
    // зеркальный сегмент.
    const mirrorNodeId = mirrorPendingId(holeSegmentHoverNodeId);
    if (mirrorNodeId !== null) ids.push(...getHoleSegmentIds(mirrorNodeId));
    return ids.length > 0 ? new Set(ids) : null;
  }, [holeSegmentHoverNodeId, getHoleSegmentIds, mirrorPendingId]);

  const deleteBeadIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setDeletedBeads(prev => {
      const next = { ...prev };
      for (const id of ids) next[id] = true;
      return next;
    });
  }, [setDeletedBeads]);

  // Пометка «на удаление» — общая для Bead и Segment, требует явного
  // подтверждения (см. ниже): удаление деструктивно, а Undo/Redo рисования
  // на deletedBeads не действует (см. spec.md), поэтому у него есть шаг
  // предпросмотра, в отличие от восстановления (clearDeletedBeads/«Restore
  // all» выше — то применяется мгновенно). Не персистится (usePersistedState
  // не нужен) — это
  // черновая пометка на время сессии работы с инструментом, а не часть
  // сохранённого проекта; сбрасывается при уходе с обоих под-инструментов
  // Hole (см. useSilyankaToolSwitch.ts).
  const [pendingDeleteMap, setPendingDeleteMap] = useState<Record<string, true>>({});

  // Отдаётся потребителям (BeadGrid/BeadView) как Set — тот же формат, что и
  // у holeSegmentPreviewIds/deletePreviewIds рядом, вместо сырого Record.
  const pendingDeleteIds = useMemo(() => new Set(Object.keys(pendingDeleteMap)), [pendingDeleteMap]);

  // ids[0] — «якорь»: у Bead это сама бисерина, у Segment — нода сегмента.
  // Если якорь уже помечен, снимаем пометку со всего списка (повторный клик
  // по той же бисерине/тому же узлу отменяет её метку) — иначе помечаем всё
  // сразу.
  const togglePendingDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteMap(prev => {
      const next = { ...prev };
      if (next[ids[0]]) {
        for (const id of ids) delete next[id];
      } else {
        for (const id of ids) next[id] = true;
      }
      return next;
    });
  }, []);

  // Кликнутая бисерина/нода идёт первой — она и остаётся «якорем» переключения
  // (см. togglePendingDelete выше), зеркальная пара просто едет следом: повторный
  // клик по той же бисерине снимает пометку с обеих сторон разом.
  const toggleBeadPending = useCallback((id: string) => {
    const mirrorId = mirrorPendingId(id);
    togglePendingDelete(mirrorId === null ? [id] : [id, mirrorId]);
  }, [togglePendingDelete, mirrorPendingId]);

  const toggleHoleSegmentPending = useCallback((nodeId: string) => {
    const ids = getHoleSegmentIds(nodeId);
    const mirrorNodeId = mirrorPendingId(nodeId);
    if (mirrorNodeId !== null) ids.push(...getHoleSegmentIds(mirrorNodeId));
    togglePendingDelete(ids);
  }, [togglePendingDelete, getHoleSegmentIds, mirrorPendingId]);

  const pendingDeleteCount = pendingDeleteIds.size;

  const confirmPendingDelete = useCallback(() => {
    deleteBeadIds(Object.keys(pendingDeleteMap));
    setPendingDeleteMap({});
  }, [deleteBeadIds, pendingDeleteMap]);

  const clearPendingDelete = useCallback(() => {
    setPendingDeleteMap({});
  }, []);

  const threadControls = useThreads(threads, drawingControls.applyPatch);

  // Прогресс плетения — отдельно от рисунка и от его истории Undo/Redo
  // (см. useWeaveProgress).
  const weave = useWeaveProgress('silyanka');

  // «Кисть» нитки — цвет/прозрачность, которыми ляжет СЛЕДУЮЩАЯ прокладываемая
  // нитка (аналог activeColor для рисования бусин, см. Header.tsx →
  // ThreadStyleButton). Не часть Undo/Redo — как и activeColor, обычный
  // usePersistedState, не через drawingControls.applyPatch.
  const [activeThreadColor, setActiveThreadColor] = usePersistedState<string>(
    'silyanka:activeThreadColor', THREAD_STRAND_DEFAULT_COLORS[1], isHexColor,
  );
  const [activeThreadOpacity, setActiveThreadOpacity] = usePersistedState<number>(
    'silyanka:activeThreadOpacity', DEFAULT_THREAD_OPACITY, isOpacity,
  );

  // Цель драга карточки подвески — нода нижнего ряда (grid) либо кончик
  // зубца (tooth), см. PendantAnchor в types/pendant.ts.
  const [hoveredPendantAnchor, setHoveredPendantAnchor] = useState<PendantAnchor | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  // Драг карточки «Tail» (декор-хвост) — своя колонка-наведение, отдельная от
  // hoveredPendantAnchor (тот подсвечивает цель драга ПОДВЕСКИ) и от
  // hoveredRow (тот — цель драга полосы Decor Bands на зазор между рядами).
  const [hoveredDecorTailCol, setHoveredDecorTailCol] = useState<number | null>(null);
  // Незавершённый выбор узла-начала цепочки (инструмент 'pendant-chain') —
  // null, пока не кликнули по первому узлу (сетки или зубца, см. ChainEndpoint
  // в types/pendant.ts).
  const [chainPendingStart, setChainPendingStart] = useState<ChainEndpoint | null>(null);
  // То же самое для зубца (инструмент 'tooth') — независимое состояние, т.к.
  // оба инструмента могут иметь незавершённый выбор параллельно (переключение
  // между ними не обязано сбрасывать выбор в другом).
  const [toothPendingStart, setToothPendingStart] = useState<number | null>(null);
  const [stampPattern, setStampPattern] = useState<StampPattern | null>(null);
  const [stampHoverNodeId, setStampHoverNodeId] = useState<string | null>(null);
  // Базовая точка привязки штампа: 'top' (по умолчанию) — targetAnchor
  // совмещается с верхним рядом захваченного мотива, 'bottom' — с нижним
  // (позволяет, например, поставить низ штампа к верхнему краю полотна).
  // Переключается кликом по бейджу у кнопки Stamp или клавишей Shift
  // (тап, не удержание — см. Shift-хендлер в App.tsx) — оба вызывают
  // toggleStampAnchorEdge и одинаково меняют это состояние насовсем.
  const [stampAnchorEdge, setStampAnchorEdge] = useState<StampAnchorEdge>('top');
  const canvasSvgRef = useRef<SVGSVGElement>(null);
  // Группа-носитель координат бисерин (translate по offsetX/offsetY/shiftX,
  // см. CanvasView.tsx) — общая с canvasSvgRef, чтобы PendantsSidebar мог
  // переводить client-координаты драга через ту же useBeadCoords (getScreenCTM),
  // которой уже пользуется сам холст (нитка/стемп), а не ручной копией той же
  // формулы: раньше toSvgPoint в PendantsSidebar.tsx считал сдвиг сам, жёстко
  // через BEAD_THEME.gridDefaults.offsetX — расходился с реальным
  // effectiveOffsetX/dim.shiftX холста (напр. при свёрнутых span-контролах,
  // офсет по умолчанию), из-за чего цель драга подвески на зубец промахивалась
  // мимо видимого узла на десятки пикселей.
  const stampGroupRef = useRef<SVGGElement>(null);

  const rowGaps = useMemo(() => {
    const nodeRowYMap = new Map<number, number>();
    beads.filter(b => b.type === 'NODE').forEach(b => {
      if (!nodeRowYMap.has(b.logicalIndex.row)) nodeRowYMap.set(b.logicalIndex.row, b.y);
    });
    const sortedRows = [...nodeRowYMap.entries()].sort(([a], [b]) => a - b);
    return sortedRows.slice(0, -1).map(([r, y], i) => ({
      row: r,
      midY: (y + sortedRows[i + 1][1]) / 2,
    }));
  }, [beads]);

  const bottomNodes = useMemo(() => beads.filter(
    b => b.type === 'NODE' && b.logicalIndex.row === 2 * gridSize.height,
  ), [beads, gridSize.height]);

  // Геометрия меша каждого зубца — единая точка входа для заливки,
  // статистики, высоты холста и индекса позиций нитки (см. computeToothMeshes
  // в tooth.ts): считает stepX/rowYStep/internalCount из главного полотна
  // один раз, а не в каждом потребителе по-своему. Считается здесь (а не
  // рядом с useTeeth ниже), т.к. нужна chainControls — цепочки-подвески могут
  // крепиться к узлам зубца (см. spec.md, «Цепочки-подвески»).
  const toothMeshes = useMemo(
    () => computeToothMeshes(teeth, bottomNodes, gridSize.spacing, gridSize.bottomSpan),
    [teeth, bottomNodes, gridSize.spacing, gridSize.bottomSpan],
  );

  const pendantControls = usePendants(
    pendantPlacements, setPendantPlacements,
    drawingControls.activeColor, drawingControls.activeTool,
    mirrorMode, gridSize.width, teeth,
  );

  const chainControls = usePendantChains(
    pendantChains, setPendantChains,
    drawingControls.activeColor, drawingControls.activeTool,
    mirrorMode, gridSize.width, teeth, toothMeshes,
  );

  const decorTailControls = useDecorTails(
    decorTailPlacements, setDecorTailPlacements,
    drawingControls.activeColor, drawingControls.activeTool,
    mirrorMode, gridSize.width,
  );

  const toothControls = useTeeth(
    teeth, setTeeth,
    drawingControls.activeColor, drawingControls.activeTool,
    mirrorMode, gridSize.width,
  );

  // Якорь ПОДВЕСКИ на колонку: настоящая нода нижнего ряда — либо, если на
  // этой колонке есть декор-хвост, его последняя бисерина. Единая точка
  // подмены: все потребители якоря подвески (PendantLayer, floodFill,
  // beadPositions, высота канваса в CanvasView) получают этот массив ВМЕСТО
  // bottomNodes, поэтому подвеска «висит на хвосте, как на ноде», не меняя
  // код ни в одном из них (см. spec.md, «Декор-хвост»). Цепочки-подвески и
  // сам DecorTailLayer в эту подмену НЕ входят — они всегда крепятся к
  // настоящей ноде (см. bottomNodes ниже).
  const decorRowStep = getDecorRowStep(gridSize.spacing);
  const pendantAnchors = useMemo(() => bottomNodes.map(n => {
    const tail = decorTailPlacements.find(t => t.col === n.logicalIndex.col);
    if (!tail) return n;
    return {
      ...n,
      id: decorTailBeadId(tail.placementId, tail.rows - 1),
      y: n.y + tail.rows * decorRowStep,
    };
  }), [bottomNodes, decorTailPlacements, decorRowStep]);

  // Контекст трансляции id для штампа — та же геометрия, что видит generator.ts.
  const stampCtx = useMemo<StampContext>(() => ({
    topSpan: gridSize.topSpan,
    bottomSpan: gridSize.bottomSpan,
    rowSpanOverrides,
    decorBands,
    beadIds: new Set(beads.map(b => b.id)),
  }), [gridSize.topSpan, gridSize.bottomSpan, rowSpanOverrides, decorBands, beads]);

  // Полный патч (id -> цвет), а не просто набор id — превью должно показывать
  // готовый рисунок штампа на целевой позиции, а не только подсвеченный
  // контур (см. spec.md, «Штамп»).
  const stampPreviewPatch = useMemo<Record<string, string> | null>(() => {
    if (!stampPattern || !stampHoverNodeId) return null;
    const targetBead = beads.find(b => b.id === stampHoverNodeId);
    if (!targetBead) return null;
    return applyStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx, stampAnchorEdge);
  }, [stampPattern, stampHoverNodeId, stampAnchorEdge, beads, stampCtx]);

  const handleStampSelect = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const pattern = captureStampPattern(ids, beads, drawingControls.designMap);
    if (pattern.entries.length === 0) return;
    setStampPattern(pattern);
    setStampHoverNodeId(null);
  }, [beads, drawingControls.designMap]);

  const toggleStampAnchorEdge = useCallback(() => {
    setStampAnchorEdge(e => (e === 'top' ? 'bottom' : 'top'));
  }, []);

  const handleStampPlace = useCallback((nodeId: string) => {
    if (!stampPattern) return;
    const targetBead = beads.find(b => b.id === nodeId);
    if (!targetBead) return;
    const patch = applyStampPattern(stampPattern, {
      row: targetBead.logicalIndex.row,
      col: targetBead.logicalIndex.col,
    }, stampCtx, stampAnchorEdge);
    if (Object.keys(patch).length === 0) return;

    drawingControls.remapDesignMap(prev => {
      const next = { ...prev, ...patch };
      if (mirrorMode) {
        for (const [id, color] of Object.entries(patch)) {
          const m = mirrorIdOf(id);
          if (m !== null && m !== id && stampCtx.beadIds.has(m)) next[m] = color;
        }
      }
      return next;
    });
  }, [stampPattern, beads, stampCtx, drawingControls, mirrorMode, mirrorIdOf, stampAnchorEdge]);

  // Заливка — единый граф сетки, подвесок, цепочек, декор-хвостов и зубцов:
  // подвеска соединена со своей якорной нодой (или кончиком хвоста той же
  // колонки, если он есть — см. pendantAnchors), цепочка — с обоими концами,
  // хвост — со своей якорной нодой, зубец — со всеми узлами своей полосы
  // [startCol, endCol] (см. toothMeshes), поэтому цвет может «перетекать»
  // между сеткой и любым декором.
  const applyUnifiedFloodFill = useCallback((startId: string, mirrorStartId: string | null) => {
    const args = [
      beads, drawingControls.designMap, drawingControls.activeColor,
      pendantPlacements, PENDANT_TEMPLATES_BY_ID, pendantAnchors, bottomNodes,
      pendantChains, decorTailPlacements, teeth, toothMeshes,
    ] as const;
    const r1 = computeUnifiedFloodFill(startId, ...args);
    const r2 = mirrorStartId
      ? computeUnifiedFloodFill(mirrorStartId, ...args)
      : { gridIds: [], pendantHits: [], chainHits: [], decorTailHits: [], toothHits: [] };

    const gridIds = [...new Set([...r1.gridIds, ...r2.gridIds])];
    const pendantHits = [...r1.pendantHits, ...r2.pendantHits];
    const chainHits = [...r1.chainHits, ...r2.chainHits];
    const decorTailHits = [...r1.decorTailHits, ...r2.decorTailHits];
    const toothHits = [...r1.toothHits, ...r2.toothHits];
    if (
      gridIds.length === 0 && pendantHits.length === 0 &&
      chainHits.length === 0 && decorTailHits.length === 0 && toothHits.length === 0
    ) return;

    const activeColor = drawingControls.activeColor;
    drawingControls.applyPatch(
      gridIds.length > 0
        ? (prev) => {
          const next = { ...prev };
          for (const id of gridIds) next[id] = activeColor;
          return next;
        }
        : null,
      pendantHits.length > 0
        ? (prev) => prev.map((p) => {
          const hits = pendantHits.filter(h => h.placementId === p.placementId);
          if (hits.length === 0) return p;
          const colorMap = { ...p.colorMap };
          for (const h of hits) colorMap[h.index] = activeColor;
          return { ...p, colorMap };
        })
        : null,
      chainHits.length > 0
        ? (prev) => prev.map((c) => {
          const hits = chainHits.filter(h => h.placementId === c.placementId);
          if (hits.length === 0) return c;
          const colorMap = { ...c.colorMap };
          for (const h of hits) colorMap[h.index] = activeColor;
          return { ...c, colorMap };
        })
        : null,
      null,
      decorTailHits.length > 0
        ? (prev) => prev.map((t) => {
          const hits = decorTailHits.filter(h => h.placementId === t.placementId);
          if (hits.length === 0) return t;
          const colorMap = { ...t.colorMap };
          for (const h of hits) colorMap[h.index] = activeColor;
          return { ...t, colorMap };
        })
        : null,
      toothHits.length > 0
        ? (prev) => prev.map((t) => {
          const hits = toothHits.filter(h => h.placementId === t.placementId);
          if (hits.length === 0) return t;
          const colorMap = { ...t.colorMap };
          for (const h of hits) colorMap[h.index] = activeColor;
          return { ...t, colorMap };
        })
        : null,
    );
  }, [
    beads, drawingControls, pendantPlacements, pendantAnchors, bottomNodes, pendantChains,
    decorTailPlacements, teeth, toothMeshes,
  ]);

  const handleFloodFill = useCallback((startId: string) => {
    const mirrorId = mirrorMode ? mirrorIdOf(startId) : null;
    applyUnifiedFloodFill(startId, mirrorId !== startId ? mirrorId : null);
  }, [applyUnifiedFloodFill, mirrorMode, mirrorIdOf]);

  // Ретроактивная симметризация: дозаполняет отсутствующую зеркальную половину
  // Design Map по текущей геометрии — полезно, если узор начали без Mirror
  // Mode или включили его на середине работы. Уже закрашенные (в т.ч.
  // конфликтующие) зеркальные пары не трогает, см. symmetrize.ts.
  const makeSymmetric = useCallback(() => {
    drawingControls.remapDesignMap(map => fillMissingMirror(map, mirrorIdOf));
  }, [drawingControls, mirrorIdOf]);

  const handlePendantPaint = useCallback((placementId: string, beadIndex: number) => {
    if (drawingControls.activeTool !== 'flood-fill') {
      pendantControls.paintPendantBead(placementId, beadIndex);
      return;
    }
    const startId = pendantBeadId(placementId, beadIndex);
    let mirrorStartId: string | null = null;
    if (mirrorMode && gridSize.width > 1) {
      const mirrorPlacement = findMirrorPendant(pendantPlacements, placementId, teeth, gridSize.width);
      if (mirrorPlacement) mirrorStartId = pendantBeadId(mirrorPlacement.placementId, beadIndex);
    }
    applyUnifiedFloodFill(startId, mirrorStartId);
  }, [
    drawingControls.activeTool, pendantControls, mirrorMode, gridSize.width, pendantPlacements,
    teeth, applyUnifiedFloodFill,
  ]);

  const handleChainPaint = useCallback((placementId: string, beadIndex: number) => {
    if (drawingControls.activeTool !== 'flood-fill') {
      chainControls.paintChainBead(placementId, beadIndex);
      return;
    }
    const startId = chainBeadId(placementId, beadIndex);
    let mirrorStartId: string | null = null;
    if (mirrorMode && gridSize.width > 1) {
      const mirrorChain = findMirrorChain(pendantChains, placementId, teeth, gridSize.width);
      if (mirrorChain) mirrorStartId = chainBeadId(mirrorChain.placementId, beadIndex);
    }
    applyUnifiedFloodFill(startId, mirrorStartId);
  }, [
    drawingControls.activeTool, chainControls, mirrorMode, gridSize.width, pendantChains, teeth,
    applyUnifiedFloodFill,
  ]);

  const handleDecorTailPaint = useCallback((placementId: string, beadIndex: number) => {
    if (drawingControls.activeTool !== 'flood-fill') {
      decorTailControls.paintBead(placementId, beadIndex);
      return;
    }
    const startId = decorTailBeadId(placementId, beadIndex);
    let mirrorStartId: string | null = null;
    if (mirrorMode && gridSize.width > 1) {
      const tail = decorTailPlacements.find(t => t.placementId === placementId);
      const mirrorCol = tail ? gridSize.width - 1 - tail.col : null;
      const mirrorTail = mirrorCol !== null
        ? decorTailPlacements.find(t => t.col === mirrorCol)
        : undefined;
      if (mirrorTail && mirrorTail.placementId !== placementId) {
        mirrorStartId = decorTailBeadId(mirrorTail.placementId, beadIndex);
      }
    }
    applyUnifiedFloodFill(startId, mirrorStartId);
  }, [
    drawingControls.activeTool, decorTailControls, mirrorMode, gridSize.width,
    decorTailPlacements, applyUnifiedFloodFill,
  ]);

  const handleToothPaint = useCallback((placementId: string, beadIndex: number) => {
    if (drawingControls.activeTool !== 'flood-fill') {
      toothControls.paintToothBead(placementId, beadIndex);
      return;
    }
    const startId = toothBeadId(placementId, beadIndex);
    let mirrorStartId: string | null = null;
    if (mirrorMode && gridSize.width > 1) {
      const tooth = teeth.find(t => t.placementId === placementId);
      if (tooth) {
        const mirrorStart = gridSize.width - 1 - tooth.endCol;
        const mirrorEnd = gridSize.width - 1 - tooth.startCol;
        const mirrorTooth = teeth.find(t =>
          t.placementId !== placementId && t.startCol === mirrorStart && t.endCol === mirrorEnd);
        if (mirrorTooth) mirrorStartId = toothBeadId(mirrorTooth.placementId, beadIndex);
      }
    }
    applyUnifiedFloodFill(startId, mirrorStartId);
  }, [drawingControls.activeTool, toothControls, mirrorMode, gridSize.width, teeth, applyUnifiedFloodFill]);

  // Инструмент 'pendant-chain': клик по узлу (сетки или зубца, см.
  // ChainEndpoint) отмечает начало, следующий клик по другому узлу — конец и
  // создаёт цепочку. Повторный клик по тому же узлу отменяет незавершённый
  // выбор. chainControls.addChain сам молча отбрасывает недопустимую пару
  // (одна сторона одного зубца, см. chainEndpointsAllowed) — pending всё
  // равно сбрасывается, как при успешной простановке (тот же приём, что у
  // зубцов ниже).
  const handleChainNodeClick = useCallback((endpoint: ChainEndpoint) => {
    if (chainPendingStart === null) {
      setChainPendingStart(endpoint);
      return;
    }
    if (chainEndpointsEqual(chainPendingStart, endpoint)) {
      setChainPendingStart(null);
      return;
    }
    chainControls.addChain(chainPendingStart, endpoint);
    setChainPendingStart(null);
  }, [chainPendingStart, chainControls]);

  // Инструмент 'tooth': тот же двухкликовый выбор, что у цепочки-подвески —
  // клик по узлу нижнего ряда отмечает начало полосы, следующий клик по
  // другому узлу — конец и создаёт зубец. Пересечение с существующим зубцом
  // (включая касание общей колонкой) toothControls.addTooth молча
  // игнорирует — pending всё равно сбрасывается, как при успешной простановке.
  // Зубец занимает ноды своей полосы целиком (см. spec.md, «Зубец») —
  // computeToothInsertionRanges (та же точка правды, что использует
  // addTooth) говорит, какие диапазоны реально добавятся (основной и,
  // возможно, зеркальный), и с их колонок снимаются точечные подвески.
  const handleToothNodeClick = useCallback((col: number) => {
    if (toothPendingStart === null) {
      setToothPendingStart(col);
      return;
    }
    if (col === toothPendingStart) {
      setToothPendingStart(null);
      return;
    }
    const ranges = computeToothInsertionRanges(toothPendingStart, col, teeth, mirrorMode, gridSize.width);
    for (const r of ranges) pendantControls.removeGridPlacementsInRange(r.startCol, r.endCol);
    toothControls.addTooth(toothPendingStart, col);
    setToothPendingStart(null);
  }, [toothPendingStart, toothControls, pendantControls, teeth, mirrorMode, gridSize.width]);

  return {
    ...gridConfig,
    pendantPlacements, setPendantPlacements,
    pendantChains, setPendantChains, chainControls, chainPendingStart, setChainPendingStart,
    decorTailPlacements, setDecorTailPlacements, decorTailControls,
    teeth, setTeeth, toothControls, toothMeshes, toothPendingStart, setToothPendingStart,
    threads, threadControls, weave,
    activeThreadColor, setActiveThreadColor, activeThreadOpacity, setActiveThreadOpacity,
    beads, hasDeletedBeads, clearDeletedBeads, drawingControls, pendantControls,
    beadById, holeSegmentPreviewIds, setHoleSegmentHoverNodeId,
    toggleBeadPending, toggleHoleSegmentPending, pendingDeleteIds, pendingDeleteCount,
    confirmPendingDelete, clearPendingDelete,
    hoveredPendantAnchor, setHoveredPendantAnchor, hoveredRow, setHoveredRow,
    hoveredDecorTailCol, setHoveredDecorTailCol,
    stampPattern, setStampPattern, stampHoverNodeId, setStampHoverNodeId, stampPreviewPatch,
    stampAnchorEdge, toggleStampAnchorEdge,
    canvasSvgRef, stampGroupRef, rowGaps, bottomNodes, pendantAnchors, decorRowStep, internalTop, internalBottom,
    handleStampSelect, handleStampPlace,
    handleFloodFill, handlePendantPaint, handleChainPaint, handleDecorTailPaint, handleToothPaint,
    handleChainNodeClick, handleToothNodeClick,
    makeSymmetric,
  };
};

export type SilyankaProject = ReturnType<typeof useSilyankaProject>;
