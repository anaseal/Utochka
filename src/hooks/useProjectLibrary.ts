import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Technique } from '../components/Editor/Header/Header.types';
import { captureSchemeThumbnail, CanvasTheme } from '../utils/exportScheme';
import {
  ProjectRecord, listProjects, getActiveProjectId, saveNewProject, updateActiveProject,
  renameProject, deleteProject, duplicateProject, loadProject, hasLiveDataChanged,
  setAutosaveEnabled, isAutosaveEnabled,
} from '../utils/projectLibrary';

// Раз в столько мс, пока вкладка видима, фоновый автосейв проверяет, не
// разошлась ли живая работа с последним снимком активного проекта (см.
// autosave-эффект ниже) — тот же порядок величины, что и у debounce в
// usePersistedState, но заметно крупнее: там 300мс достаточно для одного
// setItem, здесь на каждый "грязный" тик ещё и рендерится миниатюра
// (captureSchemeThumbnail), гонять её на каждый чих нельзя.
const AUTOSAVE_INTERVAL_MS = 8000;

// Отдельный, более частый такт для индикатора «есть несохранённые правки» в
// хедере (ProjectStatus.tsx). Он может быть чаще автосейва именно потому, что
// делает только дешёвую половину его работы — сравнение ключей localStorage со
// снимком (hasLiveDataChanged), без растеризации миниатюры, из-за которой у
// автосейва и стоят 8с.
const DIRTY_POLL_INTERVAL_MS = 4000;

// Хук библиотеки проектов активной техники (см. src/utils/projectLibrary.ts).
// Вызывается РОВНО ОДИН РАЗ, в App.tsx, и раздаётся пропом двум потребителям
// (статус проекта в хедере и сама галерея) через XxxEditor — как settings и
// projectIO. Раньше жил внутри ProjectGallery.tsx, но второй вызов ради
// хедера означал бы вторую петлю автосейва: две растеризации миниатюры
// каждые 8с и гонка записей в одну и ту же запись IndexedDB.
//
// Технику держит параметром, а не по хуку на каждую: неактивные техники
// галереи не имеют, а переключение проекта всё равно перезагружает страницу
// (см. switchTo), так что в отличие от useSilyankaProject/... сохранять
// состояние хука при переключении техники не нужно — эффект ниже просто
// перечитывает список.
export const useProjectLibrary = (technique: Technique, canvasTheme: CanvasTheme) => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(() => getActiveProjectId(technique));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setProjects(await listProjects(technique));
    } finally {
      setIsLoading(false);
    }
  }, [technique]);

  useEffect(() => {
    setActiveId(getActiveProjectId(technique));
    refresh();
  }, [technique, refresh]);

  // Ищет живой холст по стабильному классу .canvas__svg (CanvasView.css),
  // общему у всех четырёх техник, вместо прокидывания canvasSvgRef через
  // каждый XxxProject-хук — в App.tsx единовременно смонтирован холст только
  // одной активной техники, так что querySelector однозначен.
  const captureThumbnail = useCallback(async (): Promise<Blob | null> => {
    const svg = document.querySelector<SVGSVGElement>('.canvas__svg');
    if (!svg) return null;
    try {
      return await captureSchemeThumbnail(svg, canvasTheme);
    } catch {
      return null;
    }
  }, [canvasTheme]);

  // Общая обёртка над мутирующими операциями — IndexedDB может отказать
  // (квота, приватный режим браузера); тот же приём мягкого отказа, что и
  // hasPersistError в useReferenceImage.ts, вместо необработанного отказа
  // промиса или падения UI.
  const guarded = useCallback(async (fn: () => Promise<void>): Promise<void> => {
    try {
      setError(null);
      await fn();
    } catch {
      setError('Could not save to project storage — it may be full or unavailable.');
    }
  }, []);

  const saveAsNew = useCallback((name: string): Promise<void> => guarded(async () => {
    const thumbnail = await captureThumbnail();
    const record = await saveNewProject(technique, name, thumbnail);
    setActiveId(record.id);
    await refresh();
  }), [guarded, technique, captureThumbnail, refresh]);

  // projects лежит в state и обновляется после каждого refresh(), в том
  // числе после каждого автосейва (см. ниже) — держать его в зависимостях
  // autosave-эффекта означало бы пересоздавать таймер на каждый успешный
  // тик. Вместо этого автосейв читает актуальный список через ref.
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  // Запись активного проекта целиком (не только id) — нужна и статусу в
  // хедере (имя, updatedAt, autosaveEnabled), и опросу «разошлась ли живая
  // работа» ниже. null и когда активного проекта нет, и пока список ещё
  // читается из IndexedDB после монтирования.
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeId) ?? null,
    [projects, activeId],
  );

  // Ручная перезапись активного проекта текущей работой. Тот же код, что
  // делает тик автосейва (см. ниже) — но вызывается кнопкой «Save» в хедере,
  // когда автосейв у проекта выключен и иначе сохраниться было бы нечем.
  const saveNow = useCallback((): Promise<void> => guarded(async () => {
    const thumbnail = await captureThumbnail();
    await updateActiveProject(technique, thumbnail);
    await refresh();
  }), [guarded, technique, captureThumbnail, refresh]);

  // «Живая работа разошлась с последним снимком активного проекта» — источник
  // статуса в хедере. Отдельный опрос, а не побочный результат автосейва:
  // автосейв у проекта может быть выключен (и по умолчанию выключен), а знать
  // про несохранённые правки надо именно тогда.
  //
  // Зависимость от activeProject, а не от activeId: после каждого сохранения
  // refresh() приносит новую запись, эффект перезапускается и сразу же, не
  // дожидаясь такта, гасит флаг — иначе кнопка «Save» ещё несколько секунд
  // выглядела бы ненажатой. setIsDirty тем же значением React отсекает сам,
  // так что холостые такты никого не перерисовывают.
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    if (!activeProject) {
      setIsDirty(false);
      return undefined;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      setIsDirty(hasLiveDataChanged(technique, activeProject));
      timer = setTimeout(tick, DIRTY_POLL_INTERVAL_MS);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeProject, technique]);

  // Фоновый автосейв активного проекта — см. spec.md, «Библиотека
  // проектов»: пока activeId есть, раз в AUTOSAVE_INTERVAL_MS (и
  // дополнительно перед уходом со страницы) сверяем живую работу со
  // снимком активного проекта и, если разошлись, тихо перезаписываем его
  // (hasLiveDataChanged/saveNow) — без отдельной кнопки "Update", как файл
  // в Figma. savingRef не даёт двум проверкам (таймер +
  // visibilitychange/pagehide) наложиться друг на друга.
  useEffect(() => {
    if (!activeId) return undefined;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const savingRef = { current: false };

    const check = async () => {
      if (cancelled || savingRef.current) return;
      const project = projectsRef.current.find((p) => p.id === activeId);
      if (!project || !isAutosaveEnabled(project)) return;
      if (!hasLiveDataChanged(technique, project)) return;
      savingRef.current = true;
      await saveNow();
      savingRef.current = false;
    };

    const tick = () => {
      check().finally(() => {
        if (!cancelled) timer = setTimeout(tick, AUTOSAVE_INTERVAL_MS);
      });
    };
    timer = setTimeout(tick, AUTOSAVE_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') check();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', check);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', check);
    };
  }, [activeId, technique, saveNow]);

  const rename = useCallback((id: string, name: string): Promise<void> => guarded(async () => {
    await renameProject(id, name);
    await refresh();
  }), [guarded, refresh]);

  const remove = useCallback((id: string): Promise<void> => guarded(async () => {
    await deleteProject(id);
    setActiveId((current) => (current === id ? null : current));
    await refresh();
  }), [guarded, refresh]);

  const duplicate = useCallback((id: string, name: string): Promise<void> => guarded(async () => {
    await duplicateProject(id, name);
    await refresh();
  }), [guarded, refresh]);

  // Настройка конкретного проекта, не привязана к тому, активен ли он сейчас —
  // выключенный автосейв учитывается позже, когда (если) проект снова станет
  // активным (см. isAutosaveEnabled в autosave-эффекте выше).
  const toggleAutosave = useCallback((id: string, enabled: boolean): Promise<void> => guarded(async () => {
    await setAutosaveEnabled(id, enabled);
    await refresh();
  }), [guarded, refresh]);

  // Тот же паттерн, что у импорта файла/Share-ссылки (useProjectIO.ts):
  // замена ключей техники → полная перезагрузка страницы. "Горячей" замены
  // нет — хуки состояния (useSilyankaProject и т.д.) читают localStorage
  // синхронно только при монтировании.
  //
  // Подтверждение спрашивает ProjectGallery.tsx, а не этот хук: там же лежат
  // подтверждения Duplicate и Delete, и хук данных не знает про UI.
  const switchTo = useCallback((id: string): Promise<void> => guarded(async () => {
    await loadProject(id);
    window.location.reload();
  }), [guarded]);

  return {
    projects, isLoading, activeId, activeProject, isDirty, error,
    saveAsNew, saveNow, rename, remove, duplicate, switchTo, toggleAutosave,
  };
};

export type ProjectLibrary = ReturnType<typeof useProjectLibrary>;
