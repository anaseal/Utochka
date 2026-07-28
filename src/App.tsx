/* src/App.tsx */
import { useEffect, useRef, useState } from 'react';
import { useSilyankaProject } from './hooks/useSilyankaProject';
import { useCrossWeaveProject } from './hooks/useCrossWeaveProject';
import { usePersistedState } from './hooks/usePersistedState';
import { useFullscreen } from './hooks/useFullscreen';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { CrossWeaveCanvasView } from './components/Editor/CanvasView/CrossWeaveCanvasView';
import { Header, Technique } from './components/Editor/Header/Header';
import { PendantsSidebar } from './components/Sidebar/PendantsSidebar';
import { GridSidebar } from './components/Sidebar/GridSidebar';
import { ReferenceWindow } from './components/Editor/ReferenceWindow/ReferenceWindow';
import { PENDANT_TEMPLATES, PENDANT_TEMPLATES_BY_ID } from './data/pendantTemplates';
import { DrawingTool } from './hooks/useDrawing';
import { WeaveTool, WeaveOrientation } from './components/Editor/Header/WeaveControls';
import { APP_CONSTRAINTS } from './config/theme';
import { clamp } from './utils/clamp';
import { exportProject, importProject, applyProjectData } from './utils/projectFile';
import { buildShareUrl, parseShareHash } from './utils/shareLink';
import { Toast } from './components/Toast/Toast';

const DEFAULT_PALETTE = ['#ff4757', '#ffd32a', '#22d3ee', '#e879f9', '#ffffff'];

const isZoom = (v: unknown): v is number =>
  typeof v === 'number' && v >= APP_CONSTRAINTS.minZoom && v <= APP_CONSTRAINTS.maxZoom;

const isTechnique = (v: unknown): v is Technique => v === 'silyanka' || v === 'crossWeave';

const isPalette = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c));

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const isWeaveTool = (v: unknown): v is WeaveTool =>
  v === 'segment' || v === 'bead' || v === 'erase';

const isWeaveOrientation = (v: unknown): v is WeaveOrientation =>
  v === 'vertical' || v === 'horizontal';

function App() {
  const [technique, setTechnique] = usePersistedState<Technique>('app:technique', 'silyanka', isTechnique);
  const [zoom, setZoom] = usePersistedState<number>('app:zoom', 1, isZoom);
  const [palette, setPalette] = usePersistedState<string[]>('app:palette', DEFAULT_PALETTE, isPalette);
  const [canvasTheme, setCanvasTheme] = usePersistedState<'dark' | 'light'>(
    'app:canvasTheme', 'dark', (v): v is 'dark' | 'light' => v === 'dark' || v === 'light',
  );
  const [referenceOpen, setReferenceOpen] = usePersistedState<boolean>(
    'app:referenceWindow:open', false, isBoolean,
  );
  // Режим плетения — отдельный мод: инструментов рисования в нём нет, холст
  // только отмечает прогресс (см. spec.md, «Режим плетения»). Сам режим и вид
  // полотна общие для обеих техник, а прогресс у каждой свой (useWeaveProgress).
  const [weaveMode, setWeaveMode] = usePersistedState<boolean>('app:weaveMode', false, isBoolean);
  const [weaveTool, setWeaveTool] = usePersistedState<WeaveTool>(
    'app:weaveTool', 'segment', isWeaveTool,
  );
  const [weaveOrientation, setWeaveOrientation] = usePersistedState<WeaveOrientation>(
    'app:weaveOrientation', 'vertical', isWeaveOrientation,
  );
  const [weaveFlipped, setWeaveFlipped] = usePersistedState<boolean>(
    'app:weaveFlip', false, isBoolean,
  );
  const toggleWeaveOrientation = () => {
    setWeaveOrientation((o) => (o === 'vertical' ? 'horizontal' : 'vertical'));
  };
  // Полноэкранный режим (Fullscreen API) — независимый тумблер внутри режима
  // плетения, не персистится (браузер и не даёт восстановить его без
  // пользовательского жеста при перезагрузке страницы).
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreen();
  // Рамка «здесь я остановилась» не горит постоянно: показывается на пару
  // секунд после нажатия Locate (WeaveControls) и гаснет сама.
  const [weaveShowLast, setWeaveShowLast] = useState(false);
  useEffect(() => {
    if (!weaveShowLast) return;
    const timer = setTimeout(() => setWeaveShowLast(false), 2500);
    return () => clearTimeout(timer);
  }, [weaveShowLast]);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const showToast = (message: string) => setToast({ id: Date.now(), message });
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateZoom = (delta: number) => {
    setZoom(prev => clamp(prev + delta, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom));
  };
  const setZoomAbsolute = (v: number) => {
    setZoom(clamp(v, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom));
  };

  const handleLoadProject = async (file: File) => {
    if (!window.confirm('Current work will be replaced, continue?')) return;
    try {
      await importProject(file);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load project.');
    }
  };

  const handleShareProject = async () => {
    let url: string;
    try {
      url = await buildShareUrl();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create link.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      // Клипборд может отказать (например, если между кликом и записью
      // прошло слишком много времени из-за сетевого запроса, и браузер
      // успел снять разрешение) — тогда отдаём ссылку вручную, чтобы
      // шеринг не проваливался молча.
      window.prompt('Could not copy automatically — copy the link manually:', url);
    }
  };

  // Ссылку-Share (см. src/utils/shareLink.ts) можно открыть только один раз
  // за загрузку страницы — сразу после обработки хэш чистится через
  // history.replaceState, иначе confirm() всплывал бы повторно на каждом
  // F5/навигации назад.
  useEffect(() => {
    (async () => {
      const data = await parseShareHash(window.location.hash);
      if (!data) return;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!window.confirm('Load pattern from link? Current work will be replaced.')) return;
      applyProjectData(data);
      window.location.reload();
    })();
  }, []);

  // Оба хука вызываются безусловно (Rules of Hooks) — неактивная техника
  // просто не монтируется в разметке, но её состояние живёт и не пропадает
  // при переключении назад.
  const silyanka = useSilyankaProject(palette);
  const crossWeave = useCrossWeaveProject(palette);

  // Уход с инструмента «штамп» сбрасывает захваченный узор — иначе при
  // следующем заходе в штамп сразу показывается старый preview и мешает
  // заново выделить область (см. Escape-хендлер ниже — тот же сброс).
  const setSilyankaTool = (tool: DrawingTool) => {
    if (silyanka.drawingControls.activeTool === 'stamp' && tool !== 'stamp') {
      silyanka.setStampPattern(null);
      silyanka.setStampHoverNodeId(null);
    }
    // Уход с инструмента выбора узлов цепочки сбрасывает незавершённый выбор
    // начала — иначе следующий заход в инструмент сразу считал бы старый узел
    // отмеченным.
    if (silyanka.drawingControls.activeTool === 'pendant-chain' && tool !== 'pendant-chain') {
      silyanka.setChainPendingStart(null);
    }
    silyanka.drawingControls.setActiveTool(tool);
  };

  // То же самое, что Escape/Alt (см. keydown-хендлер ниже) — общий сброс
  // захваченного узора штампа, доступный и с клавиатуры, и с тач-экрана
  // (кнопка-крестик у Stamp в Header, см. hasStampPattern/onCancelStampPattern).
  const cancelStampPattern = () => {
    silyanka.setStampPattern(null);
    silyanka.setStampHoverNodeId(null);
  };

  // Обработчик пересобирается на каждый рендер (замыкается на technique/
  // silyanka/crossWeave), но сам addEventListener — только один раз при
  // монтировании: сравнение по ref избегает постоянного снятия/навешивания
  // keydown-слушателя, которое было бы неизбежно при [technique, silyanka,
  // crossWeave] в зависимостях эффекта (оба хука возвращают новый объект-
  // литерал на каждый рендер).
  const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    handleKeyDownRef.current = (e: KeyboardEvent) => {
      if (technique === 'silyanka' && e.key === 'Escape' && silyanka.stampPattern) {
        cancelStampPattern();
        return;
      }
      if (technique === 'silyanka' && e.key === 'Escape' && silyanka.chainPendingStart !== null) {
        silyanka.setChainPendingStart(null);
        return;
      }
      // Alt сбрасывает захваченный штамп так же, как Escape, — курсор
      // сразу возвращается в режим выделения новой зоны драгом.
      if (technique === 'silyanka' && e.key === 'Alt' && silyanka.stampPattern) {
        e.preventDefault();
        cancelStampPattern();
        return;
      }
      // Shift — клавиатурный шорткат для того же тоггла, что и бейдж у кнопки
      // Stamp: один тап насовсем переключает точку привязки, удерживать не
      // нужно. e.repeat отсекает авто-повтор при удержании клавиши.
      if (
        technique === 'silyanka' && e.key === 'Shift' && !e.repeat &&
        silyanka.drawingControls.activeTool === 'stamp' && silyanka.stampPattern
      ) {
        e.preventDefault();
        silyanka.toggleStampAnchorEdge();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        const active = technique === 'silyanka' ? silyanka.drawingControls : crossWeave.drawingControls;
        if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); active.undo(); }
        if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { e.preventDefault(); active.redo(); }
        return;
      }

      // Однобуквенные шорткаты инструментов (Photoshop-style: B/E/G/S/M) —
      // не должны срабатывать при вводе в поля хедера (Stepper/ColorPicker) и
      // при удержании клавиши (e.repeat), чтобы не дёргать setActiveTool на повторе.
      if (e.altKey || e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          if (technique === 'silyanka') setSilyankaTool('pencil');
          else crossWeave.drawingControls.setActiveTool('pencil');
          break;
        case 'e':
          e.preventDefault();
          if (technique === 'silyanka') {
            setSilyankaTool(silyanka.drawingControls.activeTool === 'eraser' ? 'pencil' : 'eraser');
          } else {
            crossWeave.drawingControls.setActiveTool(crossWeave.drawingControls.activeTool === 'eraser' ? 'pencil' : 'eraser');
          }
          break;
        case 'g':
          e.preventDefault();
          if (technique === 'silyanka') {
            setSilyankaTool(silyanka.drawingControls.activeTool === 'flood-fill' ? 'pencil' : 'flood-fill');
          } else {
            crossWeave.drawingControls.setActiveTool(
              crossWeave.drawingControls.activeTool === 'flood-fill' ? 'pencil' : 'flood-fill',
            );
          }
          break;
        case 's':
          if (technique !== 'silyanka') break;
          e.preventDefault();
          setSilyankaTool(silyanka.drawingControls.activeTool === 'stamp' ? 'pencil' : 'stamp');
          break;
        case 'm':
          e.preventDefault();
          if (technique === 'silyanka') silyanka.setMirrorMode(!silyanka.mirrorMode);
          else crossWeave.setMirrorMode(!crossWeave.mirrorMode);
          break;
        case 't':
          e.preventDefault();
          if (technique === 'silyanka') {
            setSilyankaTool(silyanka.drawingControls.activeTool === 'thread' ? 'pencil' : 'thread');
          } else {
            crossWeave.drawingControls.setActiveTool(
              crossWeave.drawingControls.activeTool === 'thread' ? 'pencil' : 'thread',
            );
          }
          break;
        // Крестик плетётся двумя нитками одновременно (силянка — одной) —
        // 1/2 выбирают, какую из них ведём, и сразу включают инструмент
        // «Нитка» (тот же выбор доступен через ThreadMenu в хедере).
        case '1':
        case '2':
          if (technique !== 'crossWeave') break;
          e.preventDefault();
          crossWeave.setActiveThreadStrand(e.key === '1' ? 1 : 2);
          crossWeave.drawingControls.setActiveTool('thread');
          break;
      }
    };
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  // Пакет контролов режима плетения для хедера — из активной техники.
  // Locate скроллит к первой бисерине последнего сегмента: getElementById +
  // scrollIntoView, браузер сам учитывает zoom/поворот/отражение полотна.
  const activeWeave = technique === 'silyanka' ? silyanka.weave : crossWeave.weave;
  const weaveControls = {
    tool: weaveTool,
    onToolChange: setWeaveTool,
    markedCount: activeWeave.markedCount,
    totalCount: technique === 'silyanka' ? silyanka.beads.length : crossWeave.beads.length,
    canUndo: activeWeave.canUndo,
    onUndo: activeWeave.undo,
    onReset: activeWeave.resetAll,
    onLocate: () => {
      const first = activeWeave.lastSegment[0];
      if (!first) return;
      document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setWeaveShowLast(true);
    },
    canLocate: activeWeave.lastSegment.length > 0,
    orientation: weaveOrientation,
    onToggleOrientation: toggleWeaveOrientation,
    flipped: weaveFlipped,
    onToggleFlip: () => setWeaveFlipped((f) => !f),
    isFullscreen,
    onToggleFullscreen: toggleFullscreen,
  };

  // Панели «Pendants & Decor» и «Grid» делят один и тот же правый слот
  // (см. Sidebar.css, .sidebar — оба fixed/right:0) и поэтому взаимоисключают
  // друг друга: null | одна из двух, а не два независимых булевых стейта.
  const [activeSidebar, setActiveSidebar] = useState<'pendants' | 'grid' | null>(null);
  const togglePendantsSidebar = () => setActiveSidebar(s => (s === 'pendants' ? null : 'pendants'));
  const toggleGridSidebar = () => setActiveSidebar(s => (s === 'grid' ? null : 'grid'));

  // Вход в режим плетения закрывает боковые панели и окно референса: их
  // кнопки в самом режиме скрыты (см. Header, .header__end-icons), так что
  // открытую панель иначе было бы нечем закрыть.
  const toggleWeaveMode = () => {
    if (!weaveMode) {
      setActiveSidebar(null);
      setReferenceOpen(false);
    } else {
      // Полноэкранный режим был "для режима плетения" — выходим из него
      // вместе с самим режимом, а не оставляем висеть без своих контролов.
      exitFullscreen();
    }
    setWeaveMode(!weaveMode);
  };

  return (
    <main className={`editor${activeSidebar !== null ? ' editor--sidebar-open' : ''}`}>
      {technique === 'silyanka' ? (
        <Header
          technique="silyanka"
          onTechniqueChange={setTechnique}
          palette={palette}
          onPaletteChange={setPalette}
          activeColor={silyanka.drawingControls.activeColor}
          setActiveColor={silyanka.drawingControls.setActiveColor}
          activeTool={silyanka.drawingControls.activeTool}
          setActiveTool={setSilyankaTool}
          recentColors={silyanka.drawingControls.recentColors}
          commitRecentColor={silyanka.drawingControls.commitRecentColor}
          onClearAll={silyanka.drawingControls.clearAll}
          onSaveProject={exportProject}
          onLoadProject={handleLoadProject}
          onShareProject={handleShareProject}
          zoom={zoom}
          onZoomChange={updateZoom}
          onSetZoom={setZoomAbsolute}
          onUndo={silyanka.drawingControls.undo}
          onRedo={silyanka.drawingControls.redo}
          canUndo={silyanka.drawingControls.canUndo}
          canRedo={silyanka.drawingControls.canRedo}
          referenceWindowOpen={referenceOpen}
          onToggleReferenceWindow={() => setReferenceOpen(o => !o)}
          threads={silyanka.threads}
          onClearAllThreads={silyanka.threadControls.clearAllThreads}
          gridSidebarOpen={activeSidebar === 'grid'}
          onToggleGridSidebar={toggleGridSidebar}
          weaveMode={weaveMode}
          onToggleWeaveMode={toggleWeaveMode}
          weaveControls={weaveControls}
          silyankaProps={{
            mirrorMode: silyanka.mirrorMode,
            setMirrorMode: silyanka.setMirrorMode,
            onMakeSymmetric: silyanka.makeSymmetric,
            canMakeSymmetric: Object.keys(silyanka.drawingControls.designMap).length > 0,
            sidebarOpen: activeSidebar === 'pendants',
            onToggleSidebar: togglePendantsSidebar,
            hasStampPattern: silyanka.stampPattern !== null,
            stampAnchorEdge: silyanka.stampAnchorEdge,
            onToggleStampAnchorEdge: silyanka.toggleStampAnchorEdge,
            onCancelStampPattern: cancelStampPattern,
            activeThreadColor: silyanka.activeThreadColor,
            activeThreadOpacity: silyanka.activeThreadOpacity,
            onThreadColorChange: silyanka.setActiveThreadColor,
            onThreadOpacityChange: silyanka.setActiveThreadOpacity,
          }}
        />
      ) : (
        <Header
          technique="crossWeave"
          onTechniqueChange={setTechnique}
          palette={palette}
          onPaletteChange={setPalette}
          activeColor={crossWeave.drawingControls.activeColor}
          setActiveColor={crossWeave.drawingControls.setActiveColor}
          activeTool={crossWeave.drawingControls.activeTool}
          setActiveTool={crossWeave.drawingControls.setActiveTool}
          recentColors={crossWeave.drawingControls.recentColors}
          commitRecentColor={crossWeave.drawingControls.commitRecentColor}
          onClearAll={crossWeave.drawingControls.clearAll}
          onSaveProject={exportProject}
          onLoadProject={handleLoadProject}
          onShareProject={handleShareProject}
          zoom={zoom}
          onZoomChange={updateZoom}
          onSetZoom={setZoomAbsolute}
          onUndo={crossWeave.drawingControls.undo}
          onRedo={crossWeave.drawingControls.redo}
          canUndo={crossWeave.drawingControls.canUndo}
          canRedo={crossWeave.drawingControls.canRedo}
          referenceWindowOpen={referenceOpen}
          onToggleReferenceWindow={() => setReferenceOpen(o => !o)}
          threads={crossWeave.threads}
          onClearAllThreads={crossWeave.threadControls.clearAllThreads}
          gridSidebarOpen={activeSidebar === 'grid'}
          onToggleGridSidebar={toggleGridSidebar}
          weaveMode={weaveMode}
          onToggleWeaveMode={toggleWeaveMode}
          weaveControls={weaveControls}
          crossWeaveProps={{
            activeThreadStrand: crossWeave.activeThreadStrand,
            onSelectThreadStrand: crossWeave.setActiveThreadStrand,
            activeThreadColor: crossWeave.activeThreadColor,
            activeThreadOpacity: crossWeave.activeThreadOpacity,
            onThreadColorChange: crossWeave.setActiveThreadColor,
            onThreadOpacityChange: crossWeave.setActiveThreadOpacity,
            mirrorMode: crossWeave.mirrorMode,
            setMirrorMode: crossWeave.setMirrorMode,
            onMakeSymmetric: crossWeave.makeSymmetric,
            canMakeSymmetric: Object.keys(crossWeave.drawingControls.designMap).length > 0,
          }}
        />
      )}

      {technique === 'silyanka' ? (
        <GridSidebar
          technique="silyanka"
          open={activeSidebar === 'grid'}
          silyankaProps={{
            // Линейка на холсте — источник правды: чётный ряд её колонок на 1 меньше
            // gridSize.width, а ряд её строк на 1 больше gridSize.height (см. spec.md,
            // «Ширина/высота в панели Сетка vs. линейка»). Панель показывает и принимает
            // числа линейки, поэтому здесь ±1 — единственное место преобразования.
            gridWidth: silyanka.gridSize.width - 1,
            gridHeight: silyanka.gridSize.height + 1,
            spacing: silyanka.gridSize.spacing,
            topSpan: silyanka.gridSize.topSpan,
            bottomSpan: silyanka.gridSize.bottomSpan,
            onWidthChange: (delta) => silyanka.updateDimension('width', delta),
            onHeightChange: (delta) => silyanka.updateDimension('height', delta),
            onSpacingChange: silyanka.updateSpacing,
            onSetWidth: (v) => silyanka.setWidthAbsolute(v + 1),
            onSetHeight: (v) => silyanka.setHeightAbsolute(v - 1),
            onSetSpacing: silyanka.setSpacingAbsolute,
            onTopSpanChange: silyanka.updateTopSpan,
            onBottomSpanChange: silyanka.updateBottomSpan,
            onSetTopSpan: silyanka.setTopSpanAbsolute,
            onSetBottomSpan: silyanka.setBottomSpanAbsolute,
            onTopEdgeReset: () => silyanka.resetEdge('top'),
            onBottomEdgeReset: () => silyanka.resetEdge('bottom'),
            topEdgeEnabled: silyanka.topEdgeEnabled,
            onTopEdgeToggle: silyanka.toggleTopEdgeEnabled,
            bottomEdgeEnabled: silyanka.bottomEdgeDecor.enabled,
            onBottomEdgeToggle: silyanka.toggleBottomEdgeEnabled,
            hasPendants: silyanka.pendantPlacements.length > 0,
            hasDecorTails: silyanka.decorTailPlacements.length > 0,
            extendLeftEdge: silyanka.edgeExtension.left,
            extendRightEdge: silyanka.edgeExtension.right,
            onToggleExtendLeftEdge: silyanka.toggleExtendLeftEdge,
            onToggleExtendRightEdge: silyanka.toggleExtendRightEdge,
            taper: silyanka.taper,
            taperRowsMax: silyanka.taperRowsMax,
            taperDepthMax: silyanka.taperDepthMax,
            onTaperRowsChange: silyanka.updateTaperRows,
            onSetTaperRows: silyanka.setTaperRowsAbsolute,
            onTaperSideReset: silyanka.resetTaperSide,
            onTaperDepthChange: silyanka.updateTaperDepth,
            onSetTaperDepth: silyanka.setTaperDepthAbsolute,
            onTaperDepthReset: silyanka.resetTaperDepth,
            taperRowsLinked: silyanka.taperRowsLinked,
            onToggleTaperRowsLinked: silyanka.toggleTaperRowsLinked,
            onResetAll: silyanka.resetGridAll,
            resetAllDisabled: silyanka.gridIsDefault,
          }}
        />
      ) : (
        <GridSidebar
          technique="crossWeave"
          open={activeSidebar === 'grid'}
          crossWeaveProps={{
            gridWidth: crossWeave.gridSize.width,
            gridHeight: crossWeave.gridSize.height,
            spacing: crossWeave.gridSize.pitchX,
            onWidthChange: (delta) => crossWeave.updateDimension('width', delta),
            onHeightChange: (delta) => crossWeave.updateDimension('height', delta),
            onSpacingChange: crossWeave.updateSpacing,
            onSetWidth: crossWeave.setWidthAbsolute,
            onSetHeight: crossWeave.setHeightAbsolute,
            onSetSpacing: crossWeave.setSpacingAbsolute,
            onResetAll: crossWeave.resetGridAll,
            resetAllDisabled: crossWeave.gridIsDefault,
          }}
        />
      )}

      {technique === 'silyanka' ? (
        <CanvasView
          beads={silyanka.beads}
          canvasTheme={canvasTheme}
          onToggleCanvasTheme={() => setCanvasTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          zoom={zoom}
          onZoomChange={updateZoom}
          onSetZoom={setZoomAbsolute}
          topSpan={silyanka.gridSize.topSpan}
          bottomSpan={silyanka.gridSize.bottomSpan}
          rowSpanOverrides={silyanka.rowSpanOverrides}
          onRowSpanChange={silyanka.updateRowSpan}
          hoveredRow={silyanka.hoveredRow}
          mirrorMode={silyanka.mirrorMode}
          width={silyanka.gridSize.width}
          internalTop={silyanka.internalTop}
          internalBottom={silyanka.internalBottom}
          extendLeftEdge={silyanka.edgeExtension.left}
          extendRightEdge={silyanka.edgeExtension.right}
          pendantPlacements={silyanka.pendantPlacements}
          pendantTemplates={PENDANT_TEMPLATES_BY_ID}
          bottomNodes={silyanka.bottomNodes}
          pendantAnchors={silyanka.pendantAnchors}
          hoveredCol={silyanka.hoveredCol}
          onPaintPendantBead={silyanka.handlePendantPaint}
          onRemovePlacement={silyanka.pendantControls.removePlacement}
          pendantChains={silyanka.pendantChains}
          onPaintChainBead={silyanka.handleChainPaint}
          onRemoveChain={silyanka.chainControls.removeChain}
          decorTailPlacements={silyanka.decorTailPlacements}
          decorRowStep={silyanka.decorRowStep}
          hoveredDecorTailCol={silyanka.hoveredDecorTailCol}
          onPaintDecorTailBead={silyanka.handleDecorTailPaint}
          onRemoveDecorTail={silyanka.decorTailControls.removePlacement}
          threads={silyanka.threads}
          onAddThread={silyanka.threadControls.addThread}
          onRerouteThreadEnd={silyanka.threadControls.rerouteThreadEnd}
          onRemoveThread={silyanka.threadControls.removeThread}
          activeThreadColor={silyanka.activeThreadColor}
          activeThreadOpacity={silyanka.activeThreadOpacity}
          chainPendingStart={silyanka.chainPendingStart}
          onChainNodeClick={silyanka.handleChainNodeClick}
          canvasSvgRef={silyanka.canvasSvgRef}
          onFloodFill={silyanka.handleFloodFill}
          topEdgeEnabled={silyanka.topEdgeEnabled}
          bottomEdgeEnabled={silyanka.bottomEdgeDecor.enabled}
          stampPattern={silyanka.stampPattern}
          stampPreviewPatch={silyanka.stampPreviewPatch}
          onStampSelect={silyanka.handleStampSelect}
          onStampHover={silyanka.setStampHoverNodeId}
          onStampPlace={silyanka.handleStampPlace}
          weaveMode={weaveMode}
          weaveTool={weaveTool}
          weaveOrientation={weaveOrientation}
          weaveFlipped={weaveFlipped}
          weave={silyanka.weave}
          weaveShowLast={weaveShowLast}
          {...silyanka.drawingControls}
        />
      ) : (
        <CrossWeaveCanvasView
          beads={crossWeave.beads}
          width={crossWeave.gridSize.width}
          height={crossWeave.gridSize.height}
          canvasTheme={canvasTheme}
          onToggleCanvasTheme={() => setCanvasTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          zoom={zoom}
          onZoomChange={updateZoom}
          onSetZoom={setZoomAbsolute}
          designMap={crossWeave.drawingControls.designMap}
          activeTool={crossWeave.drawingControls.activeTool}
          activeColor={crossWeave.drawingControls.activeColor}
          isDrawing={crossWeave.drawingControls.isDrawing}
          paintBead={crossWeave.drawingControls.paintBead}
          startDrawing={crossWeave.drawingControls.startDrawing}
          stopDrawing={crossWeave.drawingControls.stopDrawing}
          mirrorMode={crossWeave.mirrorMode}
          rawWidth={crossWeave.rawWidth}
          onFloodFill={crossWeave.handleFloodFill}
          threads={crossWeave.threads}
          onAddThread={crossWeave.threadControls.addThread}
          onRerouteThreadEnd={crossWeave.threadControls.rerouteThreadEnd}
          onRemoveThread={crossWeave.threadControls.removeThread}
          activeThreadStrand={crossWeave.activeThreadStrand}
          activeThreadColor={crossWeave.activeThreadColor}
          activeThreadOpacity={crossWeave.activeThreadOpacity}
          applyPatch={crossWeave.drawingControls.applyPatch}
          weaveMode={weaveMode}
          weaveTool={weaveTool}
          weaveOrientation={weaveOrientation}
          weaveFlipped={weaveFlipped}
          weave={crossWeave.weave}
          weaveShowLast={weaveShowLast}
        />
      )}

      {technique === 'silyanka' && (
        <PendantsSidebar
          open={activeSidebar === 'pendants'}
          templates={PENDANT_TEMPLATES}
          placements={silyanka.pendantPlacements}
          onHoveredColChange={silyanka.setHoveredCol}
          onAddPlacement={silyanka.pendantControls.addPlacement}
          onClearAll={silyanka.pendantControls.clearAllPlacements}
          canvasSvgRef={silyanka.canvasSvgRef}
          bottomNodes={silyanka.bottomNodes}
          zoom={zoom}
          decorBands={silyanka.decorBands}
          rowGaps={silyanka.rowGaps}
          onDecorDrop={silyanka.handleDecorDrop}
          onDecorCount={silyanka.updateDecorBand}
          onClearDecor={silyanka.handleClearDecor}
          onHoveredRowChange={silyanka.setHoveredRow}
          decorTailPlacements={silyanka.decorTailPlacements}
          onAddDecorTail={silyanka.decorTailControls.addPlacement}
          onUpdateDecorTailLength={silyanka.decorTailControls.updateLength}
          onRemoveDecorTail={silyanka.decorTailControls.removePlacement}
          onClearDecorTails={silyanka.decorTailControls.clearAllPlacements}
          onHoveredDecorTailColChange={silyanka.setHoveredDecorTailCol}
          bottomEdgeEnabled={silyanka.bottomEdgeDecor.enabled}
          pendantChains={silyanka.pendantChains}
          chainToolActive={silyanka.drawingControls.activeTool === 'pendant-chain'}
          onToggleChainTool={() => setSilyankaTool(
            silyanka.drawingControls.activeTool === 'pendant-chain' ? 'pencil' : 'pendant-chain',
          )}
          chainPendingStart={silyanka.chainPendingStart}
          onRemoveChain={silyanka.chainControls.removeChain}
          onClearChains={silyanka.chainControls.clearAllChains}
        />
      )}

      <ReferenceWindow open={referenceOpen} setOpen={setReferenceOpen} />

      {toast && <Toast key={toast.id} message={toast.message} />}
    </main>
  );
}

export default App;
