/* src/components/Editor/LoomEditor.tsx */
import { Header } from './Header/Header';
import { EditorSidebar } from '../Sidebar/EditorSidebar';
import { GridSidebar } from '../Sidebar/GridSidebar';
import { LoomCanvasView } from './CanvasView/LoomCanvasView';
import { ProjectGallery } from './ProjectGallery/ProjectGallery';
import { AppSettings } from '../../hooks/useAppSettings';
import { ProjectIO } from '../../hooks/useProjectIO';
import { ProjectLibrary } from '../../hooks/useProjectLibrary';
import { ShowToast } from '../../hooks/useToast';
import { WeaveModePanel } from '../../hooks/useWeaveModePanel';
import { LoomProject } from '../../hooks/useLoomProject';
import { DrawingTool } from '../../hooks/useDrawing';
import { exportProject } from '../../utils/projectFile';

interface LoomEditorProps {
  settings: AppSettings;
  projectIO: ProjectIO;
  // Тост живёт в App — сюда проходит транзитом только ради отказа экспорта
  // PNG на холсте (см. LoomCanvasView.handleExport).
  showToast: ShowToast;
  loom: LoomProject;
  setLoomTool: (tool: DrawingTool) => void;
  cancelLoomStampPattern: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  weavePanel: WeaveModePanel;
  // Один экземпляр на приложение (создаётся в App.tsx) — делится между
  // статусом проекта в хедере и галереей, см. useProjectLibrary.ts.
  projectLibrary: ProjectLibrary;
  projectGalleryOpen: boolean;
  onOpenProjectGallery: () => void;
  onCloseProjectGallery: () => void;
}

// Loom — четвёртая техника: без вкладки «Decor» в правой панели и без нитки (как
// Peyote, см. spec.md, «Loom»). Режим плетения подключён так же, как у
// Peyote/SilyankaEditor/CrossWeaveEditor — сегмент здесь целый ряд (Peyote,
// в отличие от Loom, отмечает колонку, см. usePeyoteProject.ts), поэтому
// weavePanel пробрасывается тем же способом.
export const LoomEditor = ({
  settings, projectIO, showToast, loom, setLoomTool, cancelLoomStampPattern,
  sidebarOpen, onToggleSidebar, weavePanel,
  projectLibrary, projectGalleryOpen, onOpenProjectGallery, onCloseProjectGallery,
}: LoomEditorProps) => (
  <>
    <Header
      technique="loom"
      onTechniqueChange={settings.setTechnique}
      palette={settings.palette}
      onPaletteChange={settings.setPalette}
      colorSources={[loom.drawingControls.designMap]}
      activeColor={loom.drawingControls.activeColor}
      setActiveColor={loom.drawingControls.setActiveColor}
      activeTool={loom.drawingControls.activeTool}
      setActiveTool={setLoomTool}
      recentColors={loom.drawingControls.recentColors}
      commitRecentColor={loom.drawingControls.commitRecentColor}
      onClearAll={loom.drawingControls.clearAll}
      onSaveProject={exportProject}
      onLoadProject={projectIO.handleLoadProject}
      onShareProject={projectIO.handleShareProject}
      onOpenProjectGallery={onOpenProjectGallery}
      projectLibrary={projectLibrary}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
      onUndo={loom.drawingControls.undo}
      onRedo={loom.drawingControls.redo}
      canUndo={loom.drawingControls.canUndo}
      canRedo={loom.drawingControls.canRedo}
      referenceWindowOpen={settings.referenceOpen}
      onToggleReferenceWindow={() => settings.setReferenceOpen(o => !o)}
      onOpenWelcome={settings.openWelcome}
      threads={[]}
      onClearAllThreads={() => {}}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={onToggleSidebar}
      weaveMode={weavePanel.weaveMode}
      onToggleWeaveMode={weavePanel.toggleWeaveMode}
      weaveControls={weavePanel.weaveControls}
      canvasView={weavePanel.canvasView}
      loomProps={{
        mirrorMode: loom.mirrorMode,
        setMirrorMode: loom.setMirrorMode,
        onMakeSymmetric: loom.makeSymmetric,
        canMakeSymmetric: Object.keys(loom.drawingControls.designMap).length > 0,
        hasStampPattern: loom.stampPattern !== null,
        onCancelStampPattern: cancelLoomStampPattern,
      }}
    />

    {/* Без слота decor — панель одновкладочная (см. EditorSidebar.tsx). */}
    <EditorSidebar
      open={sidebarOpen}
      grid={(
        <GridSidebar
          technique="loom"
          loomProps={{
            gridWidth: loom.gridSize.width,
            gridHeight: loom.gridSize.height,
            spacing: loom.gridSize.pitchX,
            onWidthChange: (delta) => loom.updateDimension('width', delta),
            onHeightChange: (delta) => loom.updateDimension('height', delta),
            onSpacingChange: loom.updateSpacing,
            onSetWidth: loom.setWidthAbsolute,
            onSetHeight: loom.setHeightAbsolute,
            onSetSpacing: loom.setSpacingAbsolute,
            onResetAll: loom.resetGridAll,
            resetAllDisabled: loom.gridIsDefault,
          }}
        />
      )}
    />

    <LoomCanvasView
      beads={loom.beads}
      width={loom.gridSize.width}
      height={loom.gridSize.height}
      pitchX={loom.gridSize.pitchX}
      canvasTheme={settings.canvasTheme}
      onToggleCanvasTheme={settings.toggleCanvasTheme}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
      designMap={loom.drawingControls.designMap}
      activeTool={loom.drawingControls.activeTool}
      activeColor={loom.drawingControls.activeColor}
      isDrawing={loom.drawingControls.isDrawing}
      paintBead={loom.drawingControls.paintBead}
      paintBeadFast={loom.drawingControls.paintBeadFast}
      startDrawing={loom.drawingControls.startDrawing}
      stopDrawing={loom.drawingControls.stopDrawing}
      mirrorMode={loom.mirrorMode}
      onFloodFill={loom.handleFloodFill}
      stampPattern={loom.stampPattern}
      stampPreviewPatch={loom.stampPreviewPatch}
      onStampSelect={loom.handleStampSelect}
      onStampHover={loom.setStampHoverNodeId}
      onStampPlace={loom.handleStampPlace}
      applyPatch={loom.drawingControls.applyPatch}
      orientation={weavePanel.canvasOrientation}
      flipped={weavePanel.canvasFlipped}
      weaveMode={weavePanel.weaveMode}
      weaveTool={weavePanel.weaveTool}
      weave={loom.weave}
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
