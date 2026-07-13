/* src/App.tsx */
import { useEffect, useState } from 'react';
import { useSilyankaProject } from './hooks/useSilyankaProject';
import { useCrossWeaveProject } from './hooks/useCrossWeaveProject';
import { usePersistedState } from './hooks/usePersistedState';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { CrossWeaveCanvasView } from './components/Editor/CanvasView/CrossWeaveCanvasView';
import { Header, Technique } from './components/Editor/Header/Header';
import { PendantsSidebar } from './components/Sidebar/PendantsSidebar';
import { ReferenceWindow } from './components/Editor/ReferenceWindow/ReferenceWindow';
import { PENDANT_TEMPLATES, PENDANT_TEMPLATES_BY_ID } from './data/pendantTemplates';
import { DrawingTool } from './hooks/useDrawing';
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
    if (!window.confirm('Текущая работа будет заменена, продолжить?')) return;
    try {
      await importProject(file);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось загрузить проект.');
    }
  };

  const handleShareProject = async () => {
    let url: string;
    try {
      url = await buildShareUrl();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось создать ссылку.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована');
    } catch {
      // Клипборд может отказать (например, если между кликом и записью
      // прошло слишком много времени из-за сетевого запроса, и браузер
      // успел снять разрешение) — тогда отдаём ссылку вручную, чтобы
      // шеринг не проваливался молча.
      window.prompt('Не удалось скопировать автоматически — скопируйте ссылку вручную:', url);
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
      if (!window.confirm('Загрузить схему из ссылки? Текущая работа будет заменена.')) return;
      applyProjectData(data);
      window.location.reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    silyanka.drawingControls.setActiveTool(tool);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (technique === 'silyanka' && e.key === 'Escape' && silyanka.stampPattern) {
        silyanka.setStampPattern(null);
        silyanka.setStampHoverNodeId(null);
        return;
      }
      // Alt сбрасывает захваченный штамп так же, как Escape, — курсор
      // сразу возвращается в режим выделения новой зоны драгом.
      if (technique === 'silyanka' && e.key === 'Alt' && silyanka.stampPattern) {
        e.preventDefault();
        silyanka.setStampPattern(null);
        silyanka.setStampHoverNodeId(null);
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [technique, silyanka, crossWeave]);

  const sidebarOpen = technique === 'silyanka' && silyanka.sidebarOpen;

  return (
    <main className={`editor${sidebarOpen ? ' editor--sidebar-open' : ''}`}>
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
          silyankaProps={{
            // Линейка на холсте — источник правды: чётный ряд её колонок на 1 меньше
            // gridSize.width, а ряд её строк на 1 больше gridSize.height (см. spec.md,
            // «Ширина/высота в хедере vs. линейка»). Хедер показывает и принимает числа
            // линейки, поэтому здесь ±1 — единственное место преобразования.
            gridWidth: silyanka.gridSize.width - 1,
            gridHeight: silyanka.gridSize.height + 1,
            topSpan: silyanka.gridSize.topSpan,
            bottomSpan: silyanka.gridSize.bottomSpan,
            onWidthChange: (delta) => silyanka.updateDimension('width', delta),
            onHeightChange: (delta) => silyanka.updateDimension('height', delta),
            onTopSpanChange: silyanka.updateTopSpan,
            onBottomSpanChange: silyanka.updateBottomSpan,
            onTopEdgeReset: () => silyanka.resetEdge('top'),
            onBottomEdgeReset: () => silyanka.resetEdge('bottom'),
            mirrorMode: silyanka.mirrorMode,
            setMirrorMode: silyanka.setMirrorMode,
            spacing: silyanka.gridSize.spacing,
            onSpacingChange: silyanka.updateSpacing,
            sidebarOpen: silyanka.sidebarOpen,
            onToggleSidebar: () => silyanka.setSidebarOpen(o => !o),
            onSetWidth: (v) => silyanka.setWidthAbsolute(v + 1),
            onSetHeight: (v) => silyanka.setHeightAbsolute(v - 1),
            onSetTopSpan: silyanka.setTopSpanAbsolute,
            onSetBottomSpan: silyanka.setBottomSpanAbsolute,
            onSetSpacing: silyanka.setSpacingAbsolute,
            hasStampPattern: silyanka.stampPattern !== null,
            stampAnchorEdge: silyanka.stampAnchorEdge,
            onToggleStampAnchorEdge: silyanka.toggleStampAnchorEdge,
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
            mirrorMode: crossWeave.mirrorMode,
            setMirrorMode: crossWeave.setMirrorMode,
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
          topSpan={silyanka.gridSize.topSpan}
          bottomSpan={silyanka.gridSize.bottomSpan}
          rowSpanOverrides={silyanka.rowSpanOverrides}
          onRowSpanChange={silyanka.updateRowSpan}
          hoveredRow={silyanka.hoveredRow}
          mirrorMode={silyanka.mirrorMode}
          width={silyanka.gridSize.width}
          internalTop={silyanka.internalTop}
          internalBottom={silyanka.internalBottom}
          pendantPlacements={silyanka.pendantPlacements}
          pendantTemplates={PENDANT_TEMPLATES_BY_ID}
          bottomNodes={silyanka.bottomNodes}
          hoveredCol={silyanka.hoveredCol}
          onPaintPendantBead={silyanka.handlePendantPaint}
          onRemovePlacement={silyanka.pendantControls.removePlacement}
          canvasSvgRef={silyanka.canvasSvgRef}
          onFloodFill={silyanka.handleFloodFill}
          bottomEdgeEnabled={silyanka.bottomEdgeDecor.enabled}
          bottomEdgeSpan={silyanka.bottomEdgeDecor.span}
          onBottomEdgeSpanChange={silyanka.updateBottomEdgeSpan}
          stampPattern={silyanka.stampPattern}
          stampPreviewIds={silyanka.stampPreviewIds}
          onStampSelect={silyanka.handleStampSelect}
          onStampHover={silyanka.setStampHoverNodeId}
          onStampPlace={silyanka.handleStampPlace}
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
          applyPatch={crossWeave.drawingControls.applyPatch}
        />
      )}

      {technique === 'silyanka' && (
        <PendantsSidebar
          open={silyanka.sidebarOpen}
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
          bottomEdgeEnabled={silyanka.bottomEdgeDecor.enabled}
          onBottomEdgeToggle={silyanka.toggleBottomEdgeEnabled}
        />
      )}

      <ReferenceWindow open={referenceOpen} setOpen={setReferenceOpen} />

      {toast && <Toast key={toast.id} message={toast.message} />}
    </main>
  );
}

export default App;
