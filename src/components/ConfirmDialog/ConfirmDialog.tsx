import { useEffect, useId } from 'react';
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
// useDismissablePopup здесь не подходит: тот сам владеет флагом open и
// закрывается по клику снаружи, а у модалки «снаружи» — собственное
// затемнение, и открытость задаёт ожидающий промис, а не сам компонент.
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
  const titleId = useId();

  // Esc = отмена: нативный confirm так умел, без этого диалог ощущается
  // сломанным. Enter отдельно не ловим — фокус и так стоит на кнопке
  // подтверждения (autoFocus ниже), браузер нажимает её сам.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  // Клик по затемнению гасится, а не только отменяет: диалог вызывается в том
  // числе изнутри галереи проектов, и без этого тот же клик всплыл бы на её
  // затемнение и закрыл заодно и её.
  return (
    <div
      className="confirm-dialog__backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="confirm-dialog__title" id={titleId}>{title}</h2>
        {message && <p className="confirm-dialog__message">{message}</p>}

        {copyText !== undefined && (
          <input
            type="text"
            className="confirm-dialog__copy"
            value={copyText}
            readOnly
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        )}

        <div className="confirm-dialog__actions">
          {cancelLabel !== null && (
            <button type="button" className="confirm-dialog__button" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`confirm-dialog__button confirm-dialog__button--confirm${danger ? ' confirm-dialog__button--danger' : ''}`}
            onClick={onConfirm}
            autoFocus={copyText === undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
