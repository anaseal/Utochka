import { useEffect, useState } from 'react';
import './ProjectStatus.css';
import { ProjectLibrary, STORAGE_ERROR_HINT } from '../../../hooks/useProjectLibrary';
import { isAutosaveEnabled } from '../../../utils/projectLibrary';
import { formatDate, formatRelativeTime, RELATIVE_TIME_TICK_MS } from '../../../utils/relativeTime';

interface ProjectStatusProps {
  library: ProjectLibrary;
  onOpenGallery: () => void;
}

type StatusKind = 'draft' | 'saved' | 'saving' | 'unsaved' | 'failed' | 'pending';

// Левый край хедера: в каком проекте сейчас работа и сохранена ли она. Имя
// активного проекта видно прямо в строке, а не только в галерее: иначе можно
// час рисовать, не зная ни где ты, ни попадает ли это куда-нибудь
// (см. spec.md, «Библиотека проектов» → UI).
//
// Шесть состояний, а не два «сохранено/нет»:
//   draft   — активного проекта нет, а список библиотеки уже прочитан: либо
//             в проект и правда не сохранялись, либо activeId указывает на
//             запись, которой в этой технике нет (например, файл проекта
//             принёс чужой app:activeLibraryProjectId — см. applyProjectData
//             в projectFile.ts). Имя «Draft»: работа не потеряна (черновик
//             всегда лежит в localStorage), но в библиотеку не попала —
//             «Not saved» здесь было бы прямой неправдой.
//   saved   — снимок совпадает с живой работой, показываем «Saved 2m ago».
//   saving  — правки есть, но автосейв у проекта включён: он их подберёт сам
//             в пределах 8с, кнопка не нужна.
//   unsaved — правки есть, автосейв выключен (это состояние по умолчанию!) —
//             случай, когда нужна кнопка «Save»: без неё статус сообщал бы о
//             проблеме, у которой нет решения на этом экране.
//   failed  — хранилище отказало (переполнено/недоступно, см. guarded в
//             useProjectLibrary.ts). Текст ошибки целиком показывает галерея,
//             здесь — короткая метка и та же кнопка для повтора: клик по
//             «Save» не должен молча ничего не делать. Одного повтора мало —
//             при переполненной квоте он вернёт ту же ошибку, поэтому в title
//             к тексту ошибки добавлен STORAGE_ERROR_HINT («что делать»);
//             галерея, которую открывает этот же клик, показывает его строкой.
//   pending — активный проект есть, но список из IndexedDB (isLoading) ещё не
//             дочитан, так что какой это проект — не известно. Показывать в
//             этот момент «Draft» нельзя, мигнёт ложью; как только чтение
//             закончится, kind пересчитается — в draft, если activeId так и
//             не нашёлся среди записей.
//
// Тикает раз в RELATIVE_TIME_TICK_MS сам, а не через состояние в App — иначе
// каждое «2m ago → 3m ago» перерисовывало бы всё дерево редактора вместе с
// холстом. Тот же приём, что и в ProjectGallery.tsx.
export const ProjectStatus = ({ library, onOpenGallery }: ProjectStatusProps) => {
  const { activeId, activeProject, isDirty, error, saveNow, isLoading } = library;

  const [, forceTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      forceTick((n) => n + 1);
      timer = setTimeout(tick, RELATIVE_TIME_TICK_MS);
    };
    timer = setTimeout(tick, RELATIVE_TIME_TICK_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // Своё состояние на время записи, а не поле хука: кнопка блокируется, чтобы
  // второй клик не запустил второй захват миниатюры поверх первого.
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNow();
    } finally {
      setSaving(false);
    }
  };

  const kind: StatusKind = activeProject
    ? (error ? 'failed' : !isDirty ? 'saved' : isAutosaveEnabled(activeProject) ? 'saving' : 'unsaved')
    : (activeId && isLoading ? 'pending' : 'draft');

  const name = activeProject ? activeProject.name : kind === 'pending' ? '…' : 'Draft';
  const status = kind === 'saved' && activeProject ? formatRelativeTime(activeProject.updatedAt)
    : kind === 'saving' ? 'Saving…'
    : kind === 'unsaved' ? 'Unsaved changes'
    : kind === 'failed' ? 'Save failed'
    : kind === 'pending' ? ''
    : 'Not in a project';

  // Полный текст в title и aria-label: имя в строке ужимается многоточием тем
  // сильнее, чем уже экран, а на телефоне (≤599.98px) подпись состояния и
  // вовсе не показана — там его несёт цвет точки (см. ProjectStatus.css).
  const fullText = `${name}${status ? ` — ${status}` : ''}`;

  return (
    <div className="project-status">
      <button
        type="button"
        className="project-status__open"
        onClick={onOpenGallery}
        title={
          kind === 'failed' && error ? `${name} — ${error}\n${STORAGE_ERROR_HINT}`
            : activeProject && kind === 'saved' ? `${fullText}\n${formatDate(activeProject.updatedAt)}`
            : fullText
        }
        aria-label={`${fullText}. Open projects`}
      >
        <span className={`project-status__dot project-status__dot--${kind}`} />
        <span className="project-status__text">
          <span className="project-status__name">{name}</span>
          {status && <span className="project-status__state">{status}</span>}
        </span>
      </button>

      {(kind === 'unsaved' || kind === 'failed') && (
        <button
          type="button"
          className="project-status__save"
          onClick={handleSave}
          disabled={saving}
          title={kind === 'failed' ? 'Try saving to this project again' : 'Save changes to this project'}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
    </div>
  );
};
