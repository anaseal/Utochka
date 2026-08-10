import { useEffect } from 'react';
import { importProject, applyProjectData } from '../utils/projectFile';
import { buildShareUrl, parseShareHash } from '../utils/shareLink';
import type { ShowToast } from './useToast';
import type { Confirm } from './useConfirm';

// Загрузка/сохранение проекта файлом и Share-ссылкой. exportProject
// экспортируется напрямую из projectFile.ts и используется как есть — здесь
// только обёртки, требующие подтверждения/сообщений пользователю.
//
// Ни нативного confirm, ни alert: подтверждения идут через ConfirmDialog
// (useConfirm.tsx), ошибки — через тост в варианте error. Диалог рендерит
// App.tsx, туда же оба колбэка и приходят.
export const useProjectIO = (showToast: ShowToast, confirm: Confirm) => {
  const handleLoadProject = async (file: File) => {
    const confirmed = await confirm({
      title: 'Load project from file?',
      message: 'Current work will be replaced.',
      confirmLabel: 'Load',
    });
    if (!confirmed) return;
    try {
      await importProject(file);
      window.location.reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load project.', 'error');
    }
  };

  const handleShareProject = async () => {
    let url: string;
    try {
      url = await buildShareUrl();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create link.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      // Клипборд может отказать (например, если между кликом и записью
      // прошло слишком много времени из-за сетевого запроса, и браузер
      // успел снять разрешение) — тогда отдаём ссылку вручную, чтобы
      // шеринг не проваливался молча. Диалог здесь не спрашивает, а
      // сообщает, поэтому кнопка отмены ему не нужна.
      await confirm({
        title: 'Could not copy automatically',
        message: 'Copy the link manually:',
        copyText: url,
        confirmLabel: 'Done',
        cancelLabel: null,
      });
    }
  };

  // Ссылку-Share (см. src/utils/shareLink.ts) можно открыть только один раз
  // за загрузку страницы — сразу после обработки хэш чистится через
  // history.replaceState, иначе подтверждение всплывало бы повторно на каждом
  // F5/навигации назад.
  useEffect(() => {
    (async () => {
      const data = await parseShareHash(window.location.hash);
      if (!data) return;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      const confirmed = await confirm({
        title: 'Load pattern from link?',
        message: 'Current work will be replaced.',
        confirmLabel: 'Load',
      });
      if (!confirmed) return;
      applyProjectData(data);
      window.location.reload();
    })();
  }, [confirm]);

  return { handleLoadProject, handleShareProject };
};

export type ProjectIO = ReturnType<typeof useProjectIO>;
