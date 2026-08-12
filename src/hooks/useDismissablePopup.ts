import { RefObject, useEffect, useRef, useState } from 'react';

export type DismissReason = 'outside' | 'escape';

// Ядро закрытия попапа: клик снаружи и Escape для уже готового флага open.
// Вынесено из useDismissablePopup, потому что <Menu> (components/common/Menu.tsx)
// — управляемый компонент: флагом open владеет место вызова, а вот подписки на
// document должны остаться одни на проект, а не разойтись копией.
export const useDismissable = (
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: (reason: DismissReason) => void,
) => {
  // Свежий колбэк без переподписки на каждый рендер: иначе в зависимости
  // эффекта пришлось бы класть onDismiss, а он у мест вызова — стрелка,
  // новая на каждом рендере (про ref.current в рендере — см. CLAUDE.md).
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDismissRef.current('outside');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismissRef.current('escape');
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, containerRef]);
};

// Общая логика попапа: закрытие по клику снаружи и по Escape (с возвратом
// фокуса на триггер). Используется во всех попапах хедера (MirrorMenu,
// ThreadMenu, ThreadStyleButton, overflow-меню, палитра на мобилке).
export const useDismissablePopup = <TTrigger extends HTMLElement = HTMLButtonElement>() => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<TTrigger>(null);

  useDismissable(open, ref, (reason) => {
    setOpen(false);
    if (reason === 'escape') triggerRef.current?.focus();
  });

  return { open, setOpen, ref, triggerRef };
};
