import { useEffect } from 'react';
import { importProject, applyProjectData } from '../utils/projectFile';
import { buildShareUrl, parseShareHash } from '../utils/shareLink';

// Загрузка/сохранение проекта файлом и Share-ссылкой. exportProject
// экспортируется напрямую из projectFile.ts и используется как есть — здесь
// только обёртки, требующие подтверждения/сообщений пользователю.
export const useProjectIO = (showToast: (message: string) => void) => {
  const handleLoadProject = async (file: File) => {
    if (!window.confirm('Current work will be replaced, continue?')) return;
    try {
      await importProject(file);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load project.');
    }
  };

  const handleShareProject = async () => {
    let url: string;
    try {
      url = await buildShareUrl();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create link.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      // Клипборд может отказать (например, если между кликом и записью
      // прошло слишком много времени из-за сетевого запроса, и браузер
      // успел снять разрешение) — тогда отдаём ссылку вручную, чтобы
      // шеринг не проваливался молча.
      window.prompt('Could not copy automatically — copy the link manually:', url);
    }
  };

  // Ссылку-Share (см. src/utils/shareLink.ts) можно открыть только один раз
  // за загрузку страницы — сразу после обработки хэш чистится через
  // history.replaceState, иначе confirm() всплывал бы повторно на каждом
  // F5/навигации назад.
  useEffect(() => {
    (async () => {
      const data = await parseShareHash(window.location.hash);
      if (!data) return;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!window.confirm('Load pattern from link? Current work will be replaced.')) return;
      applyProjectData(data);
      window.location.reload();
    })();
  }, []);

  return { handleLoadProject, handleShareProject };
};

export type ProjectIO = ReturnType<typeof useProjectIO>;
