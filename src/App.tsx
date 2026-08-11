/* src/App.tsx */
import { useState } from 'react';
import { useSilyankaProject } from './hooks/useSilyankaProject';
import { useCrossWeaveProject } from './hooks/useCrossWeaveProject';
import { usePeyoteProject } from './hooks/usePeyoteProject';
import { useLoomProject } from './hooks/useLoomProject';
import { useAppSettings } from './hooks/useAppSettings';
import { useToast } from './hooks/useToast';
import { useConfirm } from './hooks/useConfirm';
import { useProjectIO } from './hooks/useProjectIO';
import { useProjectLibrary } from './hooks/useProjectLibrary';
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
import { WelcomeDialog } from './components/WelcomeDialog/WelcomeDialog';
import { Toast } from './components/Toast/Toast';

function App() {
  const settings = useAppSettings();
  const { toast, showToast, dismissToast } = useToast();
  // Подтверждения загрузки файла и Share-ссылки: диалог рендерится здесь, а
  // confirm уходит в useProjectIO. Галерея проектов держит свой экземпляр
  // useConfirm у себя — прокидывать confirm через четыре XxxEditor не за чем.
  const { confirm, confirmDialog } = useConfirm();
  const projectIO = useProjectIO(showToast, confirm);

  // Библиотека проектов — ровно один экземпляр на приложение: у неё два
  // потребителя (статус проекта в хедере и сама галерея), а внутри живёт
  // петля автосейва, которую нельзя заводить дважды (см. useProjectLibrary.ts).
  const projectLibrary = useProjectLibrary(settings.technique, settings.canvasTheme);

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

  // Галерея проектов — модалка (ProjectGallery.tsx), а не панель в правом
  // слоте, поэтому не часть activeSidebar выше; закрывает соседние панели
  // при открытии тем же приёмом, что и onEnterWeaveMode ниже.
  const [projectGalleryOpen, setProjectGalleryOpen] = useState(false);
  const openProjectGallery = () => {
    setProjectGalleryOpen(true);
    setActiveSidebar(null);
    settings.setReferenceOpen(false);
  };

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
          showToast={showToast}
          silyanka={silyanka}
          setSilyankaTool={setSilyankaTool}
          cancelStampPattern={cancelStampPattern}
          activeSidebar={activeSidebar}
          onTogglePendantsSidebar={togglePendantsSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
          projectLibrary={projectLibrary}
          projectGalleryOpen={projectGalleryOpen}
          onOpenProjectGallery={openProjectGallery}
          onCloseProjectGallery={() => setProjectGalleryOpen(false)}
        />
      ) : settings.technique === 'crossWeave' ? (
        <CrossWeaveEditor
          settings={settings}
          projectIO={projectIO}
          showToast={showToast}
          crossWeave={crossWeave}
          activeSidebar={activeSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
          projectLibrary={projectLibrary}
          projectGalleryOpen={projectGalleryOpen}
          onOpenProjectGallery={openProjectGallery}
          onCloseProjectGallery={() => setProjectGalleryOpen(false)}
        />
      ) : settings.technique === 'peyote' ? (
        <PeyoteEditor
          settings={settings}
          projectIO={projectIO}
          showToast={showToast}
          peyote={peyote}
          setPeyoteTool={setPeyoteTool}
          cancelPeyoteStampPattern={cancelPeyoteStampPattern}
          activeSidebar={activeSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
          projectLibrary={projectLibrary}
          projectGalleryOpen={projectGalleryOpen}
          onOpenProjectGallery={openProjectGallery}
          onCloseProjectGallery={() => setProjectGalleryOpen(false)}
        />
      ) : (
        <LoomEditor
          settings={settings}
          projectIO={projectIO}
          showToast={showToast}
          loom={loom}
          setLoomTool={setLoomTool}
          cancelLoomStampPattern={cancelLoomStampPattern}
          activeSidebar={activeSidebar}
          onToggleGridSidebar={toggleGridSidebar}
          weavePanel={weavePanel}
          projectLibrary={projectLibrary}
          projectGalleryOpen={projectGalleryOpen}
          onOpenProjectGallery={openProjectGallery}
          onCloseProjectGallery={() => setProjectGalleryOpen(false)}
        />
      )}

      <ReferenceWindow open={settings.referenceOpen} setOpen={settings.setReferenceOpen} />

      {/* Рассказ о приложении на первом запуске — рядом с тостом и диалогом
          подтверждения, а не внутри XxxEditor: окно ничего не знает о технике
          и не должно перемонтироваться при её переключении. */}
      <WelcomeDialog open={settings.welcomeOpen} onClose={settings.closeWelcome} />

      {toast && (
        <Toast key={toast.id} message={toast.message} variant={toast.variant} onDismiss={dismissToast} />
      )}

      {confirmDialog}
    </main>
  );
}

export default App;
