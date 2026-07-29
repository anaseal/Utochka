/* src/components/Editor/CrossWeaveEditor.tsx */
import { Header } from './Header/Header';
import { GridSidebar } from '../Sidebar/GridSidebar';
import { CrossWeaveCanvasView } from './CanvasView/CrossWeaveCanvasView';
import { AppSettings } from '../../hooks/useAppSettings';
import { ProjectIO } from '../../hooks/useProjectIO';
import { WeaveModePanel } from '../../hooks/useWeaveModePanel';
import { CrossWeaveProject } from '../../hooks/useCrossWeaveProject';
import { exportProject } from '../../utils/projectFile';

interface CrossWeaveEditorProps {
  settings: AppSettings;
  projectIO: ProjectIO;
  crossWeave: CrossWeaveProject;
  activeSidebar: 'pendants' | 'grid' | null;
  onToggleGridSidebar: () => void;
  weavePanel: WeaveModePanel;
}

export const CrossWeaveEditor = ({
  settings, projectIO, crossWeave, activeSidebar, onToggleGridSidebar, weavePanel,
}: CrossWeaveEditorProps) => (
  <>
    <Header
      technique="crossWeave"
      onTechniqueChange={settings.setTechnique}
      palette={settings.palette}
      onPaletteChange={settings.setPalette}
      activeColor={crossWeave.drawingControls.activeColor}
      setActiveColor={crossWeave.drawingControls.setActiveColor}
      activeTool={crossWeave.drawingControls.activeTool}
      setActiveTool={crossWeave.drawingControls.setActiveTool}
      recentColors={crossWeave.drawingControls.recentColors}
      commitRecentColor={crossWeave.drawingControls.commitRecentColor}
      onClearAll={crossWeave.drawingControls.clearAll}
      onSaveProject={exportProject}
      onLoadProject={projectIO.handleLoadProject}
      onShareProject={projectIO.handleShareProject}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
      onUndo={crossWeave.drawingControls.undo}
      onRedo={crossWeave.drawingControls.redo}
      canUndo={crossWeave.drawingControls.canUndo}
      canRedo={crossWeave.drawingControls.canRedo}
      referenceWindowOpen={settings.referenceOpen}
      onToggleReferenceWindow={() => settings.setReferenceOpen(o => !o)}
      threads={crossWeave.threads}
      onClearAllThreads={crossWeave.threadControls.clearAllThreads}
      gridSidebarOpen={activeSidebar === 'grid'}
      onToggleGridSidebar={onToggleGridSidebar}
      weaveMode={weavePanel.weaveMode}
      onToggleWeaveMode={weavePanel.toggleWeaveMode}
      weaveControls={weavePanel.weaveControls}
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

    <CrossWeaveCanvasView
      beads={crossWeave.beads}
      width={crossWeave.gridSize.width}
      height={crossWeave.gridSize.height}
      canvasTheme={settings.canvasTheme}
      onToggleCanvasTheme={settings.toggleCanvasTheme}
      zoom={settings.zoom}
      onZoomChange={settings.updateZoom}
      onSetZoom={settings.setZoomAbsolute}
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
      weaveMode={weavePanel.weaveMode}
      weaveTool={weavePanel.weaveTool}
      weaveOrientation={weavePanel.weaveOrientation}
      weaveFlipped={weavePanel.weaveFlipped}
      weave={crossWeave.weave}
      weaveShowLast={weavePanel.weaveShowLast}
    />
  </>
);
