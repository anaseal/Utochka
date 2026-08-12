import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Copy, Trash2 } from 'lucide-react';
import { Button } from '../../common/Button';
import { IconButton } from '../../common/IconButton';
import { Modal } from '../../common/Modal';
import { Switch } from '../../common/Switch';
import { TextField } from '../../common/TextField';
import './ProjectGallery.css';
import { ProjectRecord, isAutosaveEnabled } from '../../../utils/projectLibrary';
import { ProjectLibrary, STORAGE_ERROR_HINT } from '../../../hooks/useProjectLibrary';
import { useConfirm } from '../../../hooks/useConfirm';
import { formatDate, formatRelativeTime, RELATIVE_TIME_TICK_MS } from '../../../utils/relativeTime';

interface ProjectGalleryProps {
  open: boolean;
  onClose: () => void;
  // Хук библиотеки создаётся один раз в App.tsx и делится с хедером
  // (ProjectStatus.tsx) — второй его вызов здесь означал бы вторую петлю
  // автосейва, см. комментарий в useProjectLibrary.ts.
  library: ProjectLibrary;
}

// Имя проекта: 1–30 символов. Верхняя граница — через maxLength на инпуте
// переименования (браузер сам режет и вставленный текст), нижняя — через
// проверку trimmed в commitEditing ниже. Дубль клэмпится тем же числом на
// сборке дефолтного имени "‹имя› copy".
const MAX_NAME_LENGTH = 30;

// Blob → object URL: url сам по себе не React-состояние, а производное от
// blob значение (useMemo, синхронно на рендере) — эффект нужен только чтобы
// отозвать URL, когда blob сменился или карточка размонтировалась, без
// setState внутри эффекта. На карточку галереи одновременно живёт несколько
// превью, поэтому вынесено в отдельный компонент, а не в один общий ref, как
// у applyImageUrl в useReferenceImage.ts.
const ProjectThumbnail = ({ blob }: { blob: Blob | null }) => {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  return url
    ? <img src={url} alt="" className="project-gallery__thumb-img" />
    : <div className="project-gallery__thumb-empty">No preview</div>;
};

// Галерея сохранённых проектов одной техники — именованные снимки текущей
// работы (см. useProjectLibrary.ts/projectLibrary.ts), между которыми можно
// переключаться без экспорта/импорта файла. Активный проект с включённым
// автосейвом (тумблер в заголовке карточки, выключен по умолчанию — см.
// isAutosaveEnabled в projectLibrary.ts) сохраняется сам, без кнопки (см.
// autosave-эффект в useProjectLibrary.ts) — по той же модели, что у файла в
// Figma: явный клик нужен только чтобы завести новый проект, дальше он живёт
// сам. Переименование — инлайн, прямо в карточке (см. editingId ниже), без
// диалога на ввод текста. Дубль сразу получает имя по умолчанию, но само
// действие подтверждается — как и Delete, оно создаёт новую запись в
// IndexedDB. Все три подтверждения (открыть, дублировать, удалить) идут через
// свой экземпляр useConfirm — тем же приёмом, что и Load/Share в
// useProjectIO.ts.
export const ProjectGallery = ({ open, onClose, library }: ProjectGalleryProps) => {
  const {
    projects, isLoading, activeId, error,
    saveAsNew, rename, remove, duplicate, switchTo, toggleAutosave,
  } = library;

  // Перерисовка раз в RELATIVE_TIME_TICK_MS, пока модалка открыта — без неё
  // "Saved 2m ago" на карточках держал бы значение с момента открытия
  // галереи, не отражая реально прошедшее время. Тот же приём debounce/
  // re-arm через setTimeout, что и у автосейва в useProjectLibrary.ts —
  // setInterval в проекте нигде не используется.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      forceTick((n) => n + 1);
      timer = setTimeout(tick, RELATIVE_TIME_TICK_MS);
    };
    timer = setTimeout(tick, RELATIVE_TIME_TICK_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open]);

  // Инлайн-редактирование имени прямо в карточке — как в Figma, вместо
  // window.prompt (тот выглядел чужеродно рядом с остальным UI). Одновременно
  // может редактироваться только одна карточка.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const { confirm, confirmDialog } = useConfirm();

  if (!open) return null;

  // Без window.prompt на имя — как "+ New file" в Figma: проект заводится
  // одним кликом, называется позже через переименование (карандаш на карточке).
  const handleSaveNew = () => saveAsNew(`Project ${projects.length + 1}`);

  const startEditing = (project: ProjectRecord) => {
    setEditingId(project.id);
    setEditingValue(project.name);
  };

  const commitEditing = () => {
    const trimmed = editingValue.trim();
    if (editingId && trimmed) rename(editingId, trimmed);
    setEditingId(null);
  };

  // Открытие проекта затирает текущую работу и перезагружает страницу (см.
  // switchTo в useProjectLibrary.ts), поэтому спрашивается так же, как
  // загрузка файла и Share-ссылки в useProjectIO.ts.
  const handleSwitch = async (project: ProjectRecord) => {
    const confirmed = await confirm({
      title: `Open "${project.name}"?`,
      message: 'Current work will be replaced.',
      confirmLabel: 'Open',
    });
    if (confirmed) switchTo(project.id);
  };

  // Тем же приёмом, что и с именем, — без диалога на ввод текста: копия сразу
  // получает имя по умолчанию, переименовать при желании можно тем же
  // инлайн-редактором. Но само действие подтверждается, тем же паттерном, что
  // и Delete ниже — дубль тоже создаёт запись в IndexedDB.
  const handleDuplicate = async (project: ProjectRecord) => {
    const confirmed = await confirm({
      title: `Duplicate "${project.name}"?`,
      confirmLabel: 'Duplicate',
    });
    if (confirmed) duplicate(project.id, `${project.name} copy`.slice(0, MAX_NAME_LENGTH));
  };

  const handleDelete = async (project: ProjectRecord) => {
    const confirmed = await confirm({
      title: `Delete "${project.name}"?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (confirmed) remove(project.id);
  };

  // layout="stack" — содержимое встаёт колонкой прямо в панели, без общего
  // прокручиваемого тела: полоса ошибки и тулбар закреплены под шапкой, а
  // прокручивается только сетка карточек.
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Projects"
        size="lg"
        layout="stack"
        closeLabel="Close project gallery"
      >
        {/* Две строки, а не одна: «что сломалось» и «что делать». Повтор Save
            при переполненной квоте вернёт ту же ошибку, поэтому выход из
            тупика (удалить старые проекты здесь же / выгрузить файлом) должен
            быть виден рядом с самой ошибкой — см. STORAGE_ERROR_HINT. */}
        {error && (
          <div className="project-gallery__warning">
            {error}
            <span className="project-gallery__warning-hint">{STORAGE_ERROR_HINT}</span>
          </div>
        )}

        <div className="project-gallery__toolbar">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleSaveNew}>
            New project
          </Button>
        </div>

        {isLoading ? (
          <div className="project-gallery__empty">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="project-gallery__empty">
            No saved projects yet — save your current work to start a library.
          </div>
        ) : (
          <div className="project-gallery__grid">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`project-gallery__card${project.id === activeId ? ' project-gallery__card--active' : ''}`}
              >
                <button
                  type="button"
                  className="project-gallery__thumb u-checkerboard"
                  onClick={() => handleSwitch(project)}
                  title="Open this project"
                >
                  <ProjectThumbnail blob={project.thumbnail} />
                </button>
                <div className="project-gallery__card-body">
                  <div className="project-gallery__card-title-row">
                    {editingId === project.id ? (
                      <TextField
                        className="project-gallery__name-input"
                        value={editingValue}
                        onChange={setEditingValue}
                        onBlur={commitEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEditing(); }
                          if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                        }}
                        onFocus={(e) => e.target.select()}
                        maxLength={MAX_NAME_LENGTH}
                        autoFocus
                      />
                    ) : (
                      <span className="project-gallery__name" title={project.name}>{project.name}</span>
                    )}
                    <span className="project-gallery__autosave-label">Auto</span>
                    <Switch
                      checked={isAutosaveEnabled(project)}
                      onChange={(next) => toggleAutosave(project.id, next)}
                      title={isAutosaveEnabled(project) ? 'Autosave on — click to turn off' : 'Autosave off — click to turn on'}
                      aria-label="Toggle autosave"
                    />
                  </div>
                  <span className="project-gallery__date" title={formatDate(project.updatedAt)}>
                    {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>
                <div className="project-gallery__card-actions">
                  <IconButton variant="chip" onClick={() => startEditing(project)} title="Rename" icon={<Pencil size={13} />} />
                  <IconButton variant="chip" onClick={() => handleDuplicate(project)} title="Duplicate" icon={<Copy size={13} />} />
                  <IconButton variant="chip" onClick={() => handleDelete(project)} title="Delete" icon={<Trash2 size={13} />} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Диалог подтверждения — сосед галереи, а не её содержимое: обе модалки
          лежат на одном слое (--z-modal), и поверх оказывается та, что ниже
          в разметке. Внутри <Modal> он попал бы под overflow: hidden панели.
          Escape при этом закрывает только его: <Modal> ведёт стопку открытых
          окон, см. комментарий там. */}
      {confirmDialog}
    </>
  );
};
