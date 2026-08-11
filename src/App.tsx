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
import { SidebarTab } from './components/Sidebar/EditorSidebar';

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

  // Правая панель одна на всё приложение (EditorSidebar), «Decor» и «Grid» —
  // её вкладки. Раньше это были две панели с двумя кнопками в хедере, которые
  // всё равно делили один и тот же слот справа и гасили друг друга
  // (activeSidebar: 'pendants' | 'grid' | null) — то есть вели себя как
  // вкладки, не выглядя ими. Вкладка живёт отдельно от «открыта/закрыта»:
  // закрыли и открыли снова — вернулись туда же, где были. Дефолт — 'grid':
  // единственная вкладка, которая есть у всех четырёх техник.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('grid');
  const toggleSidebar = () => setSidebarOpen(o => !o);

  // Галерея проектов — модалка (ProjectGallery.tsx), а не панель в правом
  // слоте, поэтому не часть sidebarOpen выше; закрывает соседние панели
  // при открытии тем же приёмом, что и onEnterWeaveMode ниже.
  const [projectGalleryOpen, setProjectGalleryOpen] = useState(false);
  const openProjectGallery = () => {
    setProjectGalleryOpen(true);
    setSidebarOpen(false);
    settings.setReferenceOpen(false);
  };

  const weavePanel = useWeaveModePanel({
    technique: settings.technique,
    silyanka,
    crossWeave,
    peyote,
    loom,
    onEnterWeaveMode: () => {
      setSidebarOpen(false);
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
    <main className={`editor${sidebarOpen ? ' editor--sidebar-open' : ''}`}>
      {settings.technique === 'silyanka' ? (
        <SilyankaEditor
          settings={settings}
          projectIO={projectIO}
          showToast={showToast}
          silyanka={silyanka}
          setSilyankaTool={setSilyankaTool}
          cancelStampPattern={cancelStampPattern}
          sidebarOpen={sidebarOpen}
          sidebarTab={sidebarTab}
          onToggleSidebar={toggleSidebar}
          onSidebarTabChange={setSidebarTab}
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
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
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
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
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
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
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
