import { useCallback, useEffect, useRef, useState } from 'react';
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

// Хук галереи проектов одной техники (см. src/utils/projectLibrary.ts) —
// вызывается внутри конкретного XxxEditor.tsx (как GridSidebar/PendantsSidebar),
// а не безусловно для всех четырёх техник в App.tsx: переключение проекта
// всегда перезагружает страницу (см. switchTo), поэтому в отличие от
// useSilyankaProject/useCrossWeaveProject/... сохранять состояние хука при
// переключении техники не нужно.
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

  // Фоновый автосейв активного проекта — см. spec.md, «Библиотека
  // проектов»: пока activeId есть, раз в AUTOSAVE_INTERVAL_MS (и
  // дополнительно перед уходом со страницы) сверяем живую работу со
  // снимком активного проекта и, если разошлись, тихо перезаписываем его
  // (hasLiveDataChanged/updateActiveProject) — без отдельной кнопки
  // "Update", как файл в Figma. savingRef не даёт двум проверкам
  // (таймер + visibilitychange/pagehide) наложиться друг на друга.
  useEffect(() => {
    if (!activeId) return undefined;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const savingRef = { current: false };

    const check = async () => {
      if (cancelled || savingRef.current) return;
      const activeProject = projectsRef.current.find((p) => p.id === activeId);
      if (!activeProject || !isAutosaveEnabled(activeProject)) return;
      if (!hasLiveDataChanged(technique, activeProject)) return;
      savingRef.current = true;
      await guarded(async () => {
        const thumbnail = await captureThumbnail();
        await updateActiveProject(technique, thumbnail);
        await refresh();
      });
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
  }, [activeId, technique, guarded, captureThumbnail, refresh]);

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
  // подтверждение → замена ключей техники → полная перезагрузка страницы.
  // "Горячей" замены нет — хуки состояния (useSilyankaProject и т.д.) читают
  // localStorage синхронно только при монтировании.
  const switchTo = useCallback((id: string): Promise<void> => guarded(async () => {
    if (!window.confirm('Current work will be replaced. Continue?')) return;
    await loadProject(id);
    window.location.reload();
  }), [guarded]);

  return {
    projects, isLoading, activeId, error,
    saveAsNew, rename, remove, duplicate, switchTo, toggleAutosave,
  };
};

export type ProjectLibrary = ReturnType<typeof useProjectLibrary>;
