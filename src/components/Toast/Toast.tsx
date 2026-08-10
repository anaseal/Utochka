import { Check, AlertTriangle, X } from 'lucide-react';
import type { ToastVariant } from '../../hooks/useToast';
import './Toast.css';

interface ToastProps {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
}

export function Toast({ message, variant, onDismiss }: ToastProps) {
  const isError = variant === 'error';

  return (
    <div className={`toast toast--${variant}`} role={isError ? 'alert' : 'status'}>
      {isError ? <AlertTriangle size={14} className="toast__icon" /> : <Check size={14} className="toast__icon" />}
      <span>{message}</span>
      {/* Успех сам уезжает и мышь не ловит (pointer-events: none в CSS), а
          ошибку даём убрать сразу — она висит дольше и может мешать. */}
      {isError && (
        <button type="button" className="toast__close" onClick={onDismiss} aria-label="Dismiss">
          <X size={12} />
        </button>
      )}
    </div>
  );
}
