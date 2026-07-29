/* src/App.tsx */
import { useState } from 'react';
import { useSilyankaProject } from './hooks/useSilyankaProject';
import { useCrossWeaveProject } from './hooks/useCrossWeaveProject';
import { useAppSettings } from './hooks/useAppSettings';
import { useToast } from './hooks/useToast';
import { useProjectIO } from './hooks/useProjectIO';
import { useSilyankaToolSwitch } from './hooks/useSilyankaToolSwitch';
import { useEditorKeyboardShortcuts } from './hooks/useEditorKeyboardShortcuts';
import { useWeaveModePanel } from './hooks/useWeaveModePanel';
import { SilyankaEditor } from './components/Editor/SilyankaEditor';
import { CrossWeaveEditor } from './components/Editor/CrossWeaveEditor';
import { ReferenceWindow } from './components/Editor/ReferenceWindow/ReferenceWindow';
import { Toast } from './components/Toast/Toast';

function App() {
  const settings = useAppSettings();
  const { toast, showToast } = useToast();
  const projectIO = useProjectIO(showToast);

  // Оба хука вызываются безусловно (Rules of Hooks) — неактивная техника
  // просто не монтируется в разметке, но её состояние живёт и не пропадает
  // при переключении назад.
  const silyanka = useSilyankaProject(settings.palette);
  const crossWeave = useCrossWeaveProject(settings.palette);

  const { setSilyankaTool, cancelStampPattern } = useSilyankaToolSwitch(silyanka);

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
    onEnterWeaveMode: () => {
      setActiveSidebar(null);
      settings.setReferenceOpen(false);
    },
  });

  useEditorKeyboardShortcuts({
    technique: settings.technique, silyanka, crossWeave, setSilyankaTool, cancelStampPattern,
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
      ) : (
        <CrossWeaveEditor
          settings={settings}
          projectIO={projectIO}
          crossWeave={crossWeave}
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
