import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { TextField } from '../common/TextField';
import './ConfirmDialog.css';

export interface ConfirmOptions {
  title: string;
  message?: string;
  // Текст, который пользователь выделяет и копирует руками — Share-ссылка,
  // когда клипборд отказал (см. useProjectIO.ts). Единственный случай, когда
  // диалогу мало заголовка с вопросом, поэтому это отдельное поле, а не
  // произвольный ReactNode: иначе разметка потекла бы в хуки.
  copyText?: string;
  confirmLabel?: string;
  // null — кнопки отмены нет: диалог не спрашивает, а сообщает.
  cancelLabel?: string | null;
  // Красная кнопка подтверждения — для необратимого (Delete, Reset data).
  danger?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

// Замена window.confirm — нативное окно выглядело чужеродно рядом с остальным
// UI (по той же причине из галереи убрали window.prompt на имя проекта).
// Компонент чистый: состояние и промис живут в useConfirm.tsx, а ErrorBoundary
// держит своё состояние локально — он рендерится вместо рухнувшего дерева, и
// общего хука там уже нет.
//
// Затемнение, панель, Escape и клик по фону — общие для всех модалок проекта,
// они в <Modal> (layout="alert": шапки-полосы с крестиком у диалога нет,
// заголовок стоит первой строкой содержимого). Собственного флага open у
// диалога нет: его открытость и есть факт того, что он отрендерен ожидающим
// промисом. Esc = отмена — нативный confirm так умел, без этого диалог
// ощущается сломанным; Enter отдельно не ловим, фокус и так стоит на кнопке
// подтверждения (autoFocus ниже), браузер нажимает её сам.
export function ConfirmDialog({
  title,
  message,
  copyText,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open onClose={onCancel} title={title} size="sm" layout="alert">
      {message && <p className="confirm-dialog__message">{message}</p>}

      {copyText !== undefined && (
        <TextField
          className="confirm-dialog__copy"
          mono
          value={copyText}
          readOnly
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      )}

      <div className="confirm-dialog__actions">
        {cancelLabel !== null && (
          <Button variant="secondary" size="md" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="md"
          onClick={onConfirm}
          autoFocus={copyText === undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
