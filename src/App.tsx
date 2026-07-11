/* src/App.tsx */
import { useEffect, useState } from 'react';
import { useSilyankaProject } from './hooks/useSilyankaProject';
import { useKrestikProject } from './hooks/useKrestikProject';
import { usePersistedState } from './hooks/usePersistedState';
import { CanvasView } from './components/Editor/CanvasView/CanvasView';
import { KrestikCanvasView } from './components/Editor/CanvasView/KrestikCanvasView';
import { Header, Technique } from './components/Editor/Header/Header';
import { PendantsSidebar } from './components/Sidebar/PendantsSidebar';
import { PENDANT_TEMPLATES, PENDANT_TEMPLATES_BY_ID } from './data/pendantTemplates';

const PALETTE = ['#ff4757', '#ffd32a', '#22d3ee', '#e879f9', '#ffffff'] as const;

const isZoom = (v: unknown): v is number =>
  typeof v === 'number' && v >= 0.25 && v <= 3;

const isTechnique = (v: unknown): v is Technique => v === 'silyanka' || v === 'krestik';

function App() {
  const [technique, setTechnique] = usePersistedState<Technique>('app:technique', 'silyanka', isTechnique);
  const [zoom, setZoom] = usePersistedState<number>('app:zoom', 1, isZoom);
  const [canvasTheme, setCanvasTheme] = usePersistedState<'dark' | 'light'>(
    'app:canvasTheme', 'dark', (v): v is 'dark' | 'light' => v === 'dark' || v === 'light',
  );

  const updateZoom = (delta: number) => {
    setZoom(prev => Math.min(3, Math.max(0.25, prev + delta)));
  };
  const setZoomAbsolute = (v: number) => {
    setZoom(Math.min(3, Math.max(0.25, v)));
  };

  // Оба хука вызываются безусловно (Rules of Hooks) — неактивная техника
  // просто не монтируется в разметке, но её состояние живёт и не пропадает
  // при переключении назад.
  const silyanka = useSilyankaProject(PALETTE);
  const krestik = useKrestikProject(PALETTE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (technique === 'silyanka' && e.key === 'Escape' && silyanka.stampPattern) {
        silyanka.setStampPattern(null);
        silyanka.setStampHoverNodeId(null);
        return;
      }
      if (!e.ctrlKey && !e.metaKey) return;
      const active = technique === 'silyanka' ? silyanka.drawingControls : krestik.drawingControls;
      if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); active.undo(); }
      if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { e.preventDefault(); active.redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [technique, silyanka.drawingControls, krestik.drawingControls, silyanka.stampPattern, silyanka]);

  const sidebarOpen = technique === 'silyanka' && silyanka.sidebarOpen;

  return (
    <main className={`editor${sidebarOpen ? ' editor--sidebar-open' : ''}`}>
      {technique === 'silyanka' ? (
        <Header
          technique="silyanka"
          onTechniqueChange={setTechnique}
          palette={PALETTE}
          activeColor={silyanka.drawingControls.activeColor}
          setActiveColor={silyanka.drawingControls.setActiveColor}
          activeTool={silyanka.drawingControls.activeTool}
          setActiveTool={silyanka.drawingControls.setActiveTool}
          recentColors={silyanka.drawingControls.recentColors}
          commitRecentColor={silyanka.drawingControls.commitRecentColor}
          onClearAll={silyanka.drawingControls.clearAll}
          zoom={zoom}
          onZoomChange={updateZoom}
          onSetZoom={setZoomAbsolute}
          onUndo={silyanka.drawingControls.undo}
          onRedo={silyanka.drawingControls.redo}
          canUndo={silyanka.drawingControls.canUndo}
          canRedo={silyanka.drawingControls.canRedo}
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
          }}
        />
      ) : (
        <Header
          technique="krestik"
          onTechniqueChange={setTechnique}
          palette={PALETTE}
          activeColor={krestik.drawingControls.activeColor}
          setActiveColor={krestik.drawingControls.setActiveColor}
          activeTool={krestik.drawingControls.activeTool}
          setActiveTool={krestik.drawingControls.setActiveTool}
          recentColors={krestik.drawingControls.recentColors}
          commitRecentColor={krestik.drawingControls.commitRecentColor}
          onClearAll={krestik.drawingControls.clearAll}
          zoom={zoom}
          onZoomChange={updateZoom}
          onSetZoom={setZoomAbsolute}
          onUndo={krestik.drawingControls.undo}
          onRedo={krestik.drawingControls.redo}
          canUndo={krestik.drawingControls.canUndo}
          canRedo={krestik.drawingControls.canRedo}
          krestikProps={{
            gridWidth: krestik.gridSize.width,
            gridHeight: krestik.gridSize.height,
            spacing: krestik.gridSize.pitchX,
            onWidthChange: (delta) => krestik.updateDimension('width', delta),
            onHeightChange: (delta) => krestik.updateDimension('height', delta),
            onSpacingChange: krestik.updateSpacing,
            onSetWidth: krestik.setWidthAbsolute,
            onSetHeight: krestik.setHeightAbsolute,
            onSetSpacing: krestik.setSpacingAbsolute,
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
        <KrestikCanvasView
          beads={krestik.beads}
          width={krestik.gridSize.width}
          height={krestik.gridSize.height}
          canvasTheme={canvasTheme}
          onToggleCanvasTheme={() => setCanvasTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          zoom={zoom}
          onZoomChange={updateZoom}
          designMap={krestik.drawingControls.designMap}
          activeTool={krestik.drawingControls.activeTool}
          isDrawing={krestik.drawingControls.isDrawing}
          paintBead={krestik.drawingControls.paintBead}
          startDrawing={krestik.drawingControls.startDrawing}
          stopDrawing={krestik.drawingControls.stopDrawing}
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
    </main>
  );
}

export default App;
