/* src/components/Editor/PeyoteEditor.tsx */
import { Header } from './Header/Header';
import { GridSidebar } from '../Sidebar/GridSidebar';
import { PeyoteCanvasView } from './CanvasView/PeyoteCanvasView';
import { ProjectGallery } from './ProjectGallery/ProjectGallery';
import { AppSettings } from '../../hooks/useAppSettings';
import { ProjectIO } from '../../hooks/useProjectIO';
import { ProjectLibrary } from '../../hooks/useProjectLibrary';
import { ShowToast } from '../../hooks/useToast';
import { WeaveModePanel } from '../../hooks/useWeaveModePanel';
import { PeyoteProject } from '../../hooks/usePeyoteProject';
import { DrawingTool } from '../../hooks/useDrawing';
import { exportProject } from '../../utils/projectFile';

interface PeyoteEditorProps {
  settings: AppSettings;
  projectIO: ProjectIO;
  // Тост живёт в App — сюда проходит транзитом только ради отказа экспорта
  // PNG на холсте (см. PeyoteCanvasView.handleExport).
  showToast: ShowToast;
  peyote: PeyoteProject;
  setPeyoteTool: (tool: DrawingTool) => void;
  cancelPeyoteStampPattern: () => void;
  activeSidebar: 'pendants' | 'grid' | null;
  onToggleGridSidebar: () => void;
  weavePanel: WeaveModePanel;
  // Один экземпляр на приложение (создаётся в App.tsx) — делится между
  // статусом проекта в хедере и галереей, см. useProjectLibrary.ts.
  projectLibrary: ProjectLibrary;
  projectGalleryOpen: boolean;
  onOpenProjectGallery: () => void;
  onCloseProjectGallery: () => void;
}

// Peyote — третья техника: без панели «Pendants & Decor» (см. spec.md,
// «Peyote»), поэтому Editor заметно проще SilyankaEditor. Режим плетения
// подключён так же, как у SilyankaEditor/CrossWeaveEditor/LoomEditor —
// сегмент здесь целая колонка, не ряд (см. usePeyoteProject.ts, weaveSegment.ts).
export const PeyoteEditor = ({
  settings, projectIO, showToast, peyote, setPeyoteTool, cancelPeyoteStampPattern,
  activeSidebar, onToggleGridSidebar, weavePanel,
  projectLibrary, projectGalleryOpen, onOpenProjectGallery, onCloseProjectGallery,
}: PeyoteEditorProps) => (
  <>
    <Header
      technique="peyote"
      onTechniqueChange={settings.setTechnique}
      palette={settings.palette}
      onPaletteChange={settings.setPalette}
      colorSources={[peyote.drawingControls.designMap]}
      activeColor={peyote.drawingControls.activeColor}
      setActiveColor={peyote.drawingControls.setActiveColor}
      activeTool={peyote.drawingControls.activeTool}
      setActiveTool={setPeyoteTool}
      recentColors={peyote.drawingControls.recentColors}
      commitRecentColor={peyote.drawingControls.commitRecentColor}
      onClearAll={peyote.drawingControls.clearAll}
      onSaveProject={exportProject}
      onLoadProject={projectIO.handleLoadProject}
      onShareProject={projectIO.handleShareProject}
      onOpenProjectGallery={onOpenProjectGallery}
      projectLibrary={projectLibrary}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
      onUndo={peyote.drawingControls.undo}
      onRedo={peyote.drawingControls.redo}
      canUndo={peyote.drawingControls.canUndo}
      canRedo={peyote.drawingControls.canRedo}
      referenceWindowOpen={settings.referenceOpen}
      onToggleReferenceWindow={() => settings.setReferenceOpen(o => !o)}
      threads={[]}
      onClearAllThreads={() => {}}
      gridSidebarOpen={activeSidebar === 'grid'}
      onToggleGridSidebar={onToggleGridSidebar}
      weaveMode={weavePanel.weaveMode}
      onToggleWeaveMode={weavePanel.toggleWeaveMode}
      weaveControls={weavePanel.weaveControls}
      canvasView={weavePanel.canvasView}
      peyoteProps={{
        mirrorMode: peyote.mirrorMode,
        setMirrorMode: peyote.setMirrorMode,
        onMakeSymmetric: peyote.makeSymmetric,
        canMakeSymmetric: Object.keys(peyote.drawingControls.designMap).length > 0,
        hasStampPattern: peyote.stampPattern !== null,
        onCancelStampPattern: cancelPeyoteStampPattern,
      }}
    />

    <GridSidebar
      technique="peyote"
      open={activeSidebar === 'grid'}
      peyoteProps={{
        gridWidth: peyote.gridSize.width,
        gridHeight: peyote.gridSize.height,
        spacing: peyote.gridSize.pitchX,
        onWidthChange: (delta) => peyote.updateDimension('width', delta),
        onHeightChange: (delta) => peyote.updateDimension('height', delta),
        onSpacingChange: peyote.updateSpacing,
        onSetWidth: peyote.setWidthAbsolute,
        onSetHeight: peyote.setHeightAbsolute,
        onSetSpacing: peyote.setSpacingAbsolute,
        onResetAll: peyote.resetGridAll,
        resetAllDisabled: peyote.gridIsDefault,
      }}
    />

    <PeyoteCanvasView
      beads={peyote.beads}
      width={peyote.gridSize.width}
      height={peyote.gridSize.height}
      pitchX={peyote.gridSize.pitchX}
      canvasTheme={settings.canvasTheme}
      onToggleCanvasTheme={settings.toggleCanvasTheme}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
      designMap={peyote.drawingControls.designMap}
      activeTool={peyote.drawingControls.activeTool}
      activeColor={peyote.drawingControls.activeColor}
      isDrawing={peyote.drawingControls.isDrawing}
      paintBead={peyote.drawingControls.paintBead}
      paintBeadFast={peyote.drawingControls.paintBeadFast}
      startDrawing={peyote.drawingControls.startDrawing}
      stopDrawing={peyote.drawingControls.stopDrawing}
      mirrorMode={peyote.mirrorMode}
      onFloodFill={peyote.handleFloodFill}
      stampPattern={peyote.stampPattern}
      stampPreviewPatch={peyote.stampPreviewPatch}
      onStampSelect={peyote.handleStampSelect}
      onStampHover={peyote.setStampHoverNodeId}
      onStampPlace={peyote.handleStampPlace}
      applyPatch={peyote.drawingControls.applyPatch}
      orientation={weavePanel.canvasOrientation}
      flipped={weavePanel.canvasFlipped}
      weaveMode={weavePanel.weaveMode}
      weaveTool={weavePanel.weaveTool}
      weave={peyote.weave}
      weaveShowLast={weavePanel.weaveShowLast}
      showToast={showToast}
    />

    <ProjectGallery
      open={projectGalleryOpen}
      onClose={onCloseProjectGallery}
      library={projectLibrary}
    />
  </>
);
