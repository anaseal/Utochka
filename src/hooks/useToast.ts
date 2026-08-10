import { useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error';

// Ошибку читают дольше, чем «Link copied», и пропустить её дороже — поэтому
// она висит заметно дольше и закрывается кликом (см. Toast.tsx). Значения
// продублированы в длительности анимации в Toast.css.
const TOAST_DURATION_MS: Record<ToastVariant, number> = {
  success: 2200,
  error: 5000,
};

interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, variant: ToastVariant = 'success') =>
    setToast({ id: Date.now(), message, variant });
  const dismissToast = () => setToast(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS[toast.variant]);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, showToast, dismissToast };
};

export type ShowToast = ReturnType<typeof useToast>['showToast'];
