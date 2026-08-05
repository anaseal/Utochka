/* src/App.tsx */
import { useState } from 'react';
import { useSilyankaProject } from './hooks/useSilyankaProject';
import { useCrossWeaveProject } from './hooks/useCrossWeaveProject';
import { usePeyoteProject } from './hooks/usePeyoteProject';
import { useLoomProject } from './hooks/useLoomProject';
import { useAppSettings } from './hooks/useAppSettings';
import { useToast } from './hooks/useToast';
import { useProjectIO } from './hooks/useProjectIO';
import { useSilyankaToolSwitch } from './hooks/useSilyankaToolSwitch';
import { usePeyoteToolSwitch } from './hooks/usePeyoteToolSwitch';
import { useLoomToolSwitch } from './hooks/useLoomToolSwitch';
import { useEditorKeyboardShortcuts } from './hooks/useEditorKeyboardShortcuts';
import { useWeaveModePanel } from './hooks/useWeaveModePanel';
import { SilyankaEditor } from './components/Editor/SilyankaEditor';
import { CrossWeaveEditor } from './components/Editor/CrossWeaveEditor';
import { PeyoteEditor } from './components/Editor/PeyoteEditor';
import { LoomEditor } from './components/Editor/LoomEditor';
import { ReferenceWindow } from './components/Editor/ReferenceWindow/ReferenceWindow';
import { Toast } from './components/Toast/Toast';

function App() {
  const settings = useAppSettings();
  const { toast, showToast } = useToast();
  const projectIO = useProjectIO(showToast);

  // Все четыре хука вызываются безусловно (Rules of Hooks) — неактивная
  // техника просто не монтируется в разметке, но её состояние живёт и не
  // пропадает при переключении назад.
  const silyanka = useSilyankaProject(settings.palette);
  const crossWeave = useCrossWeaveProject(settings.palette);
  const peyote = usePeyoteProject(settings.palette);
  const loom = useLoomProject(settings.palette);

  const { setSilyankaTool, cancelStampPattern } = useSilyankaToolSwitch(silyanka);
  const { setPeyoteTool, cancelPeyoteStampPattern } = usePeyoteToolSwitch(peyote);
  const { setLoomTool, cancelLoomStampPattern } = useLoomToolSwitch(loom);

  // Панели «Pendants & Decor» и «Grid» делят один и тот же правый слот
  // (см. Sidebar.css, .sidebar — оба fixed/right:0) и поэтому взаимоисключают
  // друг друга: null | одна из двух, а не два независимых булевых стейта.
  const [activeSidebar, setActiveSidebar] = useState<'pendants' | 'grid' | null>(null);
  const togglePendantsSidebar = () => setActiveSidebar(s => (s === 'pendants' ? null : 'pendants'));
  const toggleGridSidebar = () => setActiveSidebar(s => (s === 'grid' ? null : 'grid'));

  const weavePanel = useWeaveModePanel({
    technique: settings.technique,
    silyanka,
    crossWeave,
    peyote,
    loom,
    onEnterWeaveMode: () => {
      setActiveSidebar(null);
      settings.setReferenceOpen(false);
    },
  });

  useEditorKeyboardShortcuts({
    technique: settings.technique, silyanka, crossWeave, peyote, loom,
    setSilyankaTool, cancelStampPattern, setPeyoteTool, cancelPeyoteStampPattern,
    setLoomTool, cancelLoomStampPattern,
    weaveMode: weavePanel.weaveMode, onWeaveUndo: weavePanel.weaveControls.onUndo,
  });

  return (
    <main className={`editor${activeSidebar !== null ? ' editor--sidebar-open' : ''}`}>
      {settings.technique === 'silyanka' ? (
        <SilyankaEditor
          settings={settings}
          projectIO={projectIO}
          silyanka={silyanka}
          setSilyankaTool={setSilyankaTool}
          cancelStampPattern={cancelStampPattern}
          activeSidebar={activeSidebar}
          onTogglePendantsSidebar={togglePendantsSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
        />
      ) : settings.technique === 'crossWeave' ? (
        <CrossWeaveEditor
          settings={settings}
          projectIO={projectIO}
          crossWeave={crossWeave}
          activeSidebar={activeSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
        />
      ) : settings.technique === 'peyote' ? (
        <PeyoteEditor
          settings={settings}
          projectIO={projectIO}
          peyote={peyote}
          setPeyoteTool={setPeyoteTool}
          cancelPeyoteStampPattern={cancelPeyoteStampPattern}
          activeSidebar={activeSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
        />
      ) : (
        <LoomEditor
          settings={settings}
          projectIO={projectIO}
          loom={loom}
          setLoomTool={setLoomTool}
          cancelLoomStampPattern={cancelLoomStampPattern}
          activeSidebar={activeSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
        />
      )}

      <ReferenceWindow open={settings.referenceOpen} setOpen={settings.setReferenceOpen} />

      {toast && <Toast key={toast.id} message={toast.message} />}
    </main>
  );
}

export default App;
