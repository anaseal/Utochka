/* src/components/Editor/SilyankaEditor.tsx */
import { Header } from './Header/Header';
import { GridSidebar } from '../Sidebar/GridSidebar';
import { CanvasView } from './CanvasView/CanvasView';
import { PendantsSidebar } from '../Sidebar/PendantsSidebar';
import { ProjectGallery } from './ProjectGallery/ProjectGallery';
import { PENDANT_TEMPLATES, PENDANT_TEMPLATES_BY_ID } from '../../data/pendantTemplates';
import { DrawingTool } from '../../hooks/useDrawing';
import { AppSettings } from '../../hooks/useAppSettings';
import { ProjectIO } from '../../hooks/useProjectIO';
import { ProjectLibrary } from '../../hooks/useProjectLibrary';
import { ShowToast } from '../../hooks/useToast';
import { WeaveModePanel } from '../../hooks/useWeaveModePanel';
import { SilyankaProject } from '../../hooks/useSilyankaProject';
import { exportProject } from '../../utils/projectFile';
import { collectColorSources } from '../../utils/projectPalette';

interface SilyankaEditorProps {
  settings: AppSettings;
  projectIO: ProjectIO;
  // Тост живёт в App — сюда проходит транзитом только ради отказа экспорта
  // PNG на холсте (см. CanvasView.handleExport).
  showToast: ShowToast;
  silyanka: SilyankaProject;
  setSilyankaTool: (tool: DrawingTool) => void;
  cancelStampPattern: () => void;
  activeSidebar: 'pendants' | 'grid' | null;
  onTogglePendantsSidebar: () => void;
  onToggleGridSidebar: () => void;
  weavePanel: WeaveModePanel;
  // Один экземпляр на приложение (создаётся в App.tsx) — делится между
  // статусом проекта в хедере и галереей, см. useProjectLibrary.ts.
  projectLibrary: ProjectLibrary;
  projectGalleryOpen: boolean;
  onOpenProjectGallery: () => void;
  onCloseProjectGallery: () => void;
}

export const SilyankaEditor = ({
  settings, projectIO, showToast, silyanka, setSilyankaTool, cancelStampPattern,
  activeSidebar, onTogglePendantsSidebar, onToggleGridSidebar, weavePanel,
  projectLibrary, projectGalleryOpen, onOpenProjectGallery, onCloseProjectGallery,
}: SilyankaEditorProps) => (
  <>
    <Header
      technique="silyanka"
      onTechniqueChange={settings.setTechnique}
      palette={settings.palette}
      onPaletteChange={settings.setPalette}
      colorSources={collectColorSources(
        silyanka.drawingControls.designMap,
        silyanka.pendantPlacements, silyanka.pendantChains,
        silyanka.decorTailPlacements, silyanka.teeth,
      )}
      activeColor={silyanka.drawingControls.activeColor}
      setActiveColor={silyanka.drawingControls.setActiveColor}
      activeTool={silyanka.drawingControls.activeTool}
      setActiveTool={setSilyankaTool}
      recentColors={silyanka.drawingControls.recentColors}
      commitRecentColor={silyanka.drawingControls.commitRecentColor}
      onClearAll={silyanka.drawingControls.clearAll}
      onSaveProject={exportProject}
      onLoadProject={projectIO.handleLoadProject}
      onShareProject={projectIO.handleShareProject}
      onOpenProjectGallery={onOpenProjectGallery}
      projectLibrary={projectLibrary}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
      onUndo={silyanka.drawingControls.undo}
      onRedo={silyanka.drawingControls.redo}
      canUndo={silyanka.drawingControls.canUndo}
      canRedo={silyanka.drawingControls.canRedo}
      referenceWindowOpen={settings.referenceOpen}
      onToggleReferenceWindow={() => settings.setReferenceOpen(o => !o)}
      threads={silyanka.threads}
      onClearAllThreads={silyanka.threadControls.clearAllThreads}
      gridSidebarOpen={activeSidebar === 'grid'}
      onToggleGridSidebar={onToggleGridSidebar}
      weaveMode={weavePanel.weaveMode}
      onToggleWeaveMode={weavePanel.toggleWeaveMode}
      weaveControls={weavePanel.weaveControls}
      canvasView={weavePanel.canvasView}
      silyankaProps={{
        mirrorMode: silyanka.mirrorMode,
        setMirrorMode: silyanka.setMirrorMode,
        onMakeSymmetric: silyanka.makeSymmetric,
        canMakeSymmetric: Object.keys(silyanka.drawingControls.designMap).length > 0,
        sidebarOpen: activeSidebar === 'pendants',
        onToggleSidebar: onTogglePendantsSidebar,
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

    <CanvasView
      beads={silyanka.beads}
      pendingDeleteIds={silyanka.pendingDeleteIds}
      onToggleBeadPending={silyanka.toggleBeadPending}
      beadById={silyanka.beadById}
      holeSegmentPreviewIds={silyanka.holeSegmentPreviewIds}
      onHoleSegmentHover={silyanka.setHoleSegmentHoverNodeId}
      onToggleHoleSegmentPending={silyanka.toggleHoleSegmentPending}
      canvasTheme={settings.canvasTheme}
      onToggleCanvasTheme={settings.toggleCanvasTheme}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
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
      hoveredPendantAnchor={silyanka.hoveredPendantAnchor}
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
      teeth={silyanka.teeth}
      toothMeshes={silyanka.toothMeshes}
      toothPendingStart={silyanka.toothPendingStart}
      onToothNodeClick={silyanka.handleToothNodeClick}
      onPaintToothBead={silyanka.handleToothPaint}
      onRemoveTooth={silyanka.toothControls.removeTooth}
      threads={silyanka.threads}
      onAddThread={silyanka.threadControls.addThread}
      onRerouteThreadEnd={silyanka.threadControls.rerouteThreadEnd}
      onRemoveThread={silyanka.threadControls.removeThread}
      activeThreadColor={silyanka.activeThreadColor}
      activeThreadOpacity={silyanka.activeThreadOpacity}
      chainPendingStart={silyanka.chainPendingStart}
      onChainNodeClick={silyanka.handleChainNodeClick}
      canvasSvgRef={silyanka.canvasSvgRef}
      stampGroupRef={silyanka.stampGroupRef}
      onFloodFill={silyanka.handleFloodFill}
      topEdgeEnabled={silyanka.topEdgeEnabled}
      bottomEdgeEnabled={silyanka.bottomEdgeDecor.enabled}
      stampPattern={silyanka.stampPattern}
      stampPreviewPatch={silyanka.stampPreviewPatch}
      onStampSelect={silyanka.handleStampSelect}
      onStampHover={silyanka.setStampHoverNodeId}
      onStampPlace={silyanka.handleStampPlace}
      orientation={weavePanel.canvasOrientation}
      flipped={weavePanel.canvasFlipped}
      weaveMode={weavePanel.weaveMode}
      weaveTool={weavePanel.weaveTool}
      weave={silyanka.weave}
      weaveShowLast={weavePanel.weaveShowLast}
      showToast={showToast}
      {...silyanka.drawingControls}
    />

    <PendantsSidebar
      open={activeSidebar === 'pendants'}
      templates={PENDANT_TEMPLATES}
      placements={silyanka.pendantPlacements}
      onHoveredPendantAnchorChange={silyanka.setHoveredPendantAnchor}
      onAddPlacement={silyanka.pendantControls.addPlacement}
      onClearAll={silyanka.pendantControls.clearAllPlacements}
      canvasSvgRef={silyanka.canvasSvgRef}
      stampGroupRef={silyanka.stampGroupRef}
      bottomNodes={silyanka.bottomNodes}
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
      teeth={silyanka.teeth}
      toothMeshes={silyanka.toothMeshes}
      toothToolActive={silyanka.drawingControls.activeTool === 'tooth'}
      onToggleToothTool={() => setSilyankaTool(
        silyanka.drawingControls.activeTool === 'tooth' ? 'pencil' : 'tooth',
      )}
      toothPendingStart={silyanka.toothPendingStart}
      onRemoveTooth={silyanka.toothControls.removeTooth}
      onClearTeeth={silyanka.toothControls.clearAllTeeth}
      holeToolActive={silyanka.drawingControls.activeTool === 'hole'}
      onToggleHoleTool={() => setSilyankaTool(
        silyanka.drawingControls.activeTool === 'hole' ? 'pencil' : 'hole',
      )}
      holeSegmentToolActive={silyanka.drawingControls.activeTool === 'hole-segment'}
      onToggleHoleSegmentTool={() => setSilyankaTool(
        silyanka.drawingControls.activeTool === 'hole-segment' ? 'pencil' : 'hole-segment',
      )}
      hasDeletedBeads={silyanka.hasDeletedBeads}
      onClearDeletedBeads={silyanka.clearDeletedBeads}
      pendingDeleteCount={silyanka.pendingDeleteCount}
      onConfirmPendingDelete={silyanka.confirmPendingDelete}
    />

    <ProjectGallery
      open={projectGalleryOpen}
      onClose={onCloseProjectGallery}
      library={projectLibrary}
    />
  </>
);
