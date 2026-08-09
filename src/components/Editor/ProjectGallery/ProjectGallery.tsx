import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Pencil, Copy, Trash2 } from 'lucide-react';
import './ProjectGallery.css';
import { Technique } from '../Header/Header.types';
import { CanvasTheme } from '../../../utils/exportScheme';
import { ProjectRecord, isAutosaveEnabled } from '../../../utils/projectLibrary';
import { useProjectLibrary } from '../../../hooks/useProjectLibrary';

interface ProjectGalleryProps {
  open: boolean;
  onClose: () => void;
  technique: Technique;
  canvasTheme: CanvasTheme;
}

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

// "Saved 2m ago" вместо голой даты — точная дата остаётся в title (hover).
// Не мемоизировано и не завязано на React Query/таймер библиотеки: компонент
// сам перерисовывается раз в TICK_INTERVAL_MS, пока модалка открыта (см. ниже),
// этого достаточно, чтобы подпись не протухала на глазах у открытой галереи.
const formatRelativeTime = (iso: string): string => {
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 5) return 'Saved just now';
  if (diffSec < 60) return `Saved ${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `Saved ${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `Saved ${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `Saved ${diffDay}d ago`;
  return `Saved ${formatDate(iso)}`;
};

const TICK_INTERVAL_MS = 15000;

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
// window.prompt: тот смотрелся чужеродно рядом с остальным UI. Дубль сразу
// получает имя по умолчанию (без prompt на ввод текста), но само действие
// подтверждается window.confirm — как и Delete, оно создаёт новую запись в
// IndexedDB. Оба подтверждения — тем же приёмом, что и Save/Load/Share в
// useProjectIO.ts.
export const ProjectGallery = ({ open, onClose, technique, canvasTheme }: ProjectGalleryProps) => {
  const {
    projects, isLoading, activeId, error,
    saveAsNew, rename, remove, duplicate, switchTo, toggleAutosave,
  } = useProjectLibrary(technique, canvasTheme);

  // Перерисовка раз в TICK_INTERVAL_MS, пока модалка открыта — без неё
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
      timer = setTimeout(tick, TICK_INTERVAL_MS);
    };
    timer = setTimeout(tick, TICK_INTERVAL_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open]);

  // Инлайн-редактирование имени прямо в карточке — как в Figma, вместо
  // window.prompt (тот выглядел чужеродно рядом с остальным UI). Одновременно
  // может редактироваться только одна карточка.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

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

  // Тем же приёмом, что и с именем, — без prompt на ввод текста: копия сразу
  // получает имя по умолчанию, переименовать при желании можно тем же
  // инлайн-редактором. Но само действие подтверждается window.confirm, тем
  // же паттерном, что и Delete ниже — дубль тоже создаёт запись в IndexedDB.
  const handleDuplicate = (project: ProjectRecord) => {
    if (!window.confirm(`Duplicate "${project.name}"?`)) return;
    duplicate(project.id, `${project.name} copy`.slice(0, MAX_NAME_LENGTH));
  };

  const handleDelete = (project: ProjectRecord) => {
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) remove(project.id);
  };

  return (
    <div className="project-gallery__backdrop" onClick={onClose}>
      <div className="project-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="project-gallery__header">
          <span className="project-gallery__title">Projects</span>
          <button
            type="button"
            className="project-gallery__icon-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close project gallery"
          >
            <X size={16} />
          </button>
        </div>

        {error && <div className="project-gallery__warning">{error}</div>}

        <div className="project-gallery__toolbar">
          <button type="button" className="project-gallery__text-btn" onClick={handleSaveNew}>
            <Plus size={14} /> New project
          </button>
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
                  className="project-gallery__thumb"
                  onClick={() => switchTo(project.id)}
                  title="Open this project"
                >
                  <ProjectThumbnail blob={project.thumbnail} />
                </button>
                <div className="project-gallery__card-body">
                  <div className="project-gallery__card-title-row">
                    {editingId === project.id ? (
                      <input
                        type="text"
                        className="project-gallery__name-input"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
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
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAutosaveEnabled(project)}
                      className="project-gallery__autosave-switch"
                      onClick={() => toggleAutosave(project.id, !isAutosaveEnabled(project))}
                      title={isAutosaveEnabled(project) ? 'Autosave on — click to turn off' : 'Autosave off — click to turn on'}
                    >
                      <span className="project-gallery__autosave-switch-thumb" />
                    </button>
                  </div>
                  <span className="project-gallery__date" title={formatDate(project.updatedAt)}>
                    {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>
                <div className="project-gallery__card-actions">
                  <button type="button" className="project-gallery__icon-btn" onClick={() => startEditing(project)} title="Rename">
                    <Pencil size={13} />
                  </button>
                  <button type="button" className="project-gallery__icon-btn" onClick={() => handleDuplicate(project)} title="Duplicate">
                    <Copy size={13} />
                  </button>
                  <button type="button" className="project-gallery__icon-btn" onClick={() => handleDelete(project)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
