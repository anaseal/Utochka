import { useCallback, useState } from 'react';
import { ConfirmDialog, type ConfirmOptions } from '../components/ConfirmDialog/ConfirmDialog';

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

// Асинхронный аналог window.confirm: `await confirm({...})` возвращает true
// или false, поэтому места вызова остались такими же линейными, какими были с
// нативным окном. Резолвер промиса лежит в состоянии рядом с опциями — клик по
// кнопке диалога и есть то, что промис разрешает.
//
// Контекста в проекте нет ни одного, и заводить его ради трёх мест не за чем:
// хук вызывается локально там, где нужен (App.tsx и ProjectGallery.tsx), тем же
// приёмом, что и useToast. Готовый узел диалога возвращается отсюда, чтобы
// разметку не дублировать на каждом месте вызова.
//
// ErrorBoundary этим хуком пользоваться не может: он рендерится вместо
// рухнувшего дерева и держит состояние подтверждения у себя, переиспользуя
// только сам ConfirmDialog.
export const useConfirm = () => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    }),
    [],
  );

  const settle = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  const confirmDialog = pending && (
    <ConfirmDialog
      {...pending.options}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
};

export type Confirm = ReturnType<typeof useConfirm>['confirm'];
