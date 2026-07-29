import { useEffect, useState } from 'react';

const TOAST_DURATION_MS = 2200;

export const useToast = () => {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const showToast = (message: string) => setToast({ id: Date.now(), message });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, showToast };
};
