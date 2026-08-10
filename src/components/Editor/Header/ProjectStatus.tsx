import { useEffect, useState } from 'react';
import { ProjectLibrary } from '../../../hooks/useProjectLibrary';
import { isAutosaveEnabled } from '../../../utils/projectLibrary';
import { formatDate, formatRelativeTime, RELATIVE_TIME_TICK_MS } from '../../../utils/relativeTime';

interface ProjectStatusProps {
  library: ProjectLibrary;
  onOpenGallery: () => void;
}

type StatusKind = 'draft' | 'saved' | 'saving' | 'unsaved' | 'failed' | 'pending';

// Левый край хедера: в каком проекте сейчас работа и сохранена ли она. До
// этого имя активного проекта не появлялось в интерфейсе нигде, кроме самой
// галереи — человек час рисовал, не зная ни где он, ни попадает ли это
// куда-нибудь (см. spec.md, «Библиотека проектов» → UI).
//
// Четыре состояния, а не два «сохранено/нет»:
//   draft   — активного проекта нет. Имя «Draft»: работа не потеряна (черновик
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
//             «Save» не должен молча ничего не делать.
//   pending — первые миллисекунды после загрузки страницы, пока список ещё
//             читается из IndexedDB: активный проект есть, но какой — ещё не
//             известно. Показывать в этот момент «Draft» нельзя, мигнёт ложью.
//
// Тикает раз в RELATIVE_TIME_TICK_MS сам, а не через состояние в App — иначе
// каждое «2m ago → 3m ago» перерисовывало бы всё дерево редактора вместе с
// холстом. Тот же приём, что и в ProjectGallery.tsx.
export const ProjectStatus = ({ library, onOpenGallery }: ProjectStatusProps) => {
  const { activeId, activeProject, isDirty, error, saveNow } = library;

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
    : (activeId ? 'pending' : 'draft');

  const name = activeProject ? activeProject.name : kind === 'pending' ? '…' : 'Draft';
  const status = kind === 'saved' && activeProject ? formatRelativeTime(activeProject.updatedAt)
    : kind === 'saving' ? 'Saving…'
    : kind === 'unsaved' ? 'Unsaved changes'
    : kind === 'failed' ? 'Save failed'
    : kind === 'pending' ? ''
    : 'Not in a project';

  // Полный текст в title и aria-label: на узких экранах подпись статуса
  // скрыта, а на самых узких от блока остаётся одна точка-индикатор.
  const fullText = `${name}${status ? ` — ${status}` : ''}`;

  return (
    <div className="project-status">
      <button
        type="button"
        className="project-status__open"
        onClick={onOpenGallery}
        title={
          kind === 'failed' && error ? `${name} — ${error}`
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
