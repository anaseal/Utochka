import { useCallback, useEffect, useRef, useState } from 'react';

// Порог смещения (в клиентских пикселях, без учёта zoom), с которого тач на
// карточке сайдбара (подвеска/декор-полоса/декор-хвост) считается драгом, а
// не листанием сайдбара — то же значение и та же идея, что
// STAMP_DRAG_THRESHOLD_TOUCH в useStampTool.ts. На мыши порог не нужен (нет
// конкурирующего нативного скролла), там драг стартует сразу по pointerdown.
const SIDEBAR_DRAG_THRESHOLD_TOUCH = 10;

interface DragState<TPayload> {
  payload: TPayload;
  x: number;
  y: number;
}

interface UseSidebarDragDropOptions<TPayload, TTarget> {
  computeTarget: (clientX: number, clientY: number) => TTarget | null;
  onHoverChange: (target: TTarget | null) => void;
  onDrop: (payload: TPayload, target: TTarget) => void;
}

// Общая механика «драг карточки из сайдбара → drop на вычисляемую цель
// (колонка/ряд холста)», вынесенная из трёх копий в PendantsSidebar.tsx
// (подвеска→колонка, декор-полоса→ряд, декор-хвост→колонка). Различие целей
// и payload параметризуется снаружи (computeTarget/onDrop), сама механика
// (touch-порог, rAF-коалессинг pointermove) одна на все три случая.
export const useSidebarDragDrop = <TPayload, TTarget>({
  computeTarget,
  onHoverChange,
  onDrop,
}: UseSidebarDragDropOptions<TPayload, TTarget>) => {
  const [drag, setDrag] = useState<DragState<TPayload> | null>(null);

  // Тач ещё не признан драгом (см. SIDEBAR_DRAG_THRESHOLD_TOUCH) — в ref, а
  // не в state: пока порог не пройден, никакого ре-рендера быть не должно.
  const pendingRef = useRef<DragState<TPayload> | null>(null);

  const start = useCallback((e: React.PointerEvent, payload: TPayload) => {
    if (e.pointerType === 'touch') {
      // Не preventDefault и не setDrag сразу: touch-action:pan-y на карточке
      // (см. PendantsSidebar.css) даёт браузеру шанс распознать это как
      // вертикальный скролл сайдбара раньше, чем сработает наш порог ниже.
      pendingRef.current = { payload, x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    setDrag({ payload, x: e.clientX, y: e.clientY });
  }, []);

  const move = useCallback((e: React.PointerEvent) => {
    const pending = pendingRef.current;
    if (!pending) return;
    const dx = e.clientX - pending.x;
    const dy = e.clientY - pending.y;
    if (Math.hypot(dx, dy) < SIDEBAR_DRAG_THRESHOLD_TOUCH) return;
    pendingRef.current = null;
    e.preventDefault();
    setDrag({ payload: pending.payload, x: e.clientX, y: e.clientY });
  }, []);

  const cancel = useCallback(() => {
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    if (!drag) return;
    // pointermove на десктопе может сыпаться чаще частоты кадров экрана —
    // без коалессинга через rAF каждое событие немедленно триггерит setState
    // (drag.x/y + hover), а значит и полный ре-рендер App/CanvasView, что на
    // большой сетке ощущается как лаг при перетаскивании карточки.
    let rafId: number | null = null;
    let pending: { x: number; y: number } | null = null;
    const flush = () => {
      rafId = null;
      const point = pending;
      if (!point) return;
      setDrag((d) => (d ? { ...d, x: point.x, y: point.y } : d));
      onHoverChange(computeTarget(point.x, point.y));
    };
    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    const onUp = (e: PointerEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const target = computeTarget(e.clientX, e.clientY);
      if (target !== null) onDrop(drag.payload, target);
      onHoverChange(null);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, computeTarget, onHoverChange, onDrop]);

  return { drag, start, move, cancel };
};
