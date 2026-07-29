import { useEffect, useRef, useState } from 'react';

// Общая логика попапа: закрытие по клику снаружи и по Escape (с возвратом
// фокуса на триггер). Используется во всех попапах хедера (MirrorMenu,
// ThreadMenu, ThreadStyleButton, overflow-меню, палитра на мобилке).
export const useDismissablePopup = <TTrigger extends HTMLElement = HTMLButtonElement>() => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<TTrigger>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, ref, triggerRef };
};
