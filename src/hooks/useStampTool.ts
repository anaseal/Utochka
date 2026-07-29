/* FILE: src\hooks\useStampTool.ts */
import { useCallback, useRef, useState } from 'react';
import { Bead } from '../types/bead';
import { StampPattern } from '../utils/stamp';
import { ToBeadCoords } from './useBeadCoords';
import { useFrameThrottle } from './useFrameThrottle';

// Порог в экранных пикселях, отличающий клик (постановка штампа) от драга
// (выделение рамкой) — независим от zoom, т.к. сравнивается в client-координатах.
// Используется только когда узор ещё не загружен (рисование новой рамки
// выделения) — пока узор загружен, тач вообще не завязан на этот порог: там
// касание сразу входит в режим «таскать превью» (см. handlePointerDown,
// mode: 'movePreview'). Отдельное touch-значение выше десктопного — палец
// толще и дрожит сильнее курсора, случайный микро-сдвиг не должен рвать рамку.
const STAMP_DRAG_THRESHOLD = 4;
const STAMP_DRAG_THRESHOLD_TOUCH = 10;

interface UseStampToolOptions {
  // !weaveMode && activeTool === 'stamp' — считается в компоненте, тому же
  // условию подчинена и маршрутизация к 'thread' на уровне контейнера.
  active: boolean;
  beads: Bead[];
  toBeadCoords: ToBeadCoords;
  stampPattern: StampPattern | null;
  onStampHover: (nodeId: string | null) => void;
  onStampSelect: (ids: string[]) => void;
  onStampPlace: (nodeId: string) => void;
  isMultiTouch: () => boolean;
}

// Вся интерактивность инструмента «Штамп» на контейнере холста: клик ставит
// копию уже загруженного узора, драг без узора рисует рамку выделения нового
// узора, тач с загруженным узором сразу таскает живое превью (см. spec.md,
// «Штамп»).
export const useStampTool = ({
  active,
  beads,
  toBeadCoords,
  stampPattern,
  onStampHover,
  onStampSelect,
  onStampPlace,
  isMultiTouch,
}: UseStampToolOptions) => {
  const stampDragRef = useRef<{
    startClient: { x: number; y: number };
    startBead: { x: number; y: number };
    dragging: boolean;
    // 'select' — обычная логика клик/драг (десктоп: клик ставит копию,
    // драг рисует новую рамку). 'movePreview' — тач-режим с уже загруженным
    // узором: палец сразу таскает живое превью, отпускание коммитит; чтобы
    // нарисовать новую рамку в этом состоянии, узор сначала сбрасывают
    // крестиком (см. spec.md, «Штамп»).
    mode: 'select' | 'movePreview';
  } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const findNearestNode = useCallback((point: { x: number; y: number }): Bead | null => {
    let nearest: Bead | null = null;
    let bestDist = Infinity;
    for (const bead of beads) {
      if (bead.type !== 'NODE') continue;
      const dx = bead.x - point.x;
      const dy = bead.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        nearest = bead;
      }
    }
    return nearest;
  }, [beads]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!active) return;
    const beadPoint = toBeadCoords(e.clientX, e.clientY);
    if (!beadPoint) return;
    // На тач с уже загруженным узором нет наведения без контакта — поэтому
    // касание сразу входит в режим «таскать превью», а не ждёт превышения
    // порога драга (см. STAMP_DRAG_THRESHOLD_TOUCH — там он больше не нужен
    // для этого случая, только для рисования новой рамки без узора).
    const movePreview = e.pointerType === 'touch' && stampPattern !== null;
    stampDragRef.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startBead: beadPoint,
      dragging: false,
      mode: movePreview ? 'movePreview' : 'select',
    };
    if (movePreview) {
      const nearest = findNearestNode(beadPoint);
      onStampHover(nearest?.id ?? null);
    }
  }, [active, toBeadCoords, stampPattern, findNearestNode, onStampHover]);

  // Линейный перебор всех бисерин в findNearestNode не нужен чаще одного раза
  // за кадр (см. useFrameThrottle). Не применяется к rect-драгу выделения
  // ниже — там нет поиска ближайшей бусины, только арифметика.
  const shouldThrottleHoverSearch = useFrameThrottle();

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!active || isMultiTouch()) return;
    const drag = stampDragRef.current;
    if (drag) {
      if (drag.mode === 'movePreview') {
        if (shouldThrottleHoverSearch()) return;
        const beadPoint = toBeadCoords(e.clientX, e.clientY);
        const nearest = beadPoint ? findNearestNode(beadPoint) : null;
        onStampHover(nearest?.id ?? null);
        return;
      }
      const dx = e.clientX - drag.startClient.x;
      const dy = e.clientY - drag.startClient.y;
      const threshold = e.pointerType === 'touch' ? STAMP_DRAG_THRESHOLD_TOUCH : STAMP_DRAG_THRESHOLD;
      if (drag.dragging || Math.hypot(dx, dy) > threshold) {
        // Момент перехода клика в драг — прячем протухший preview старого
        // штампа, чтобы он не мешал видеть новую рамку выделения.
        if (!drag.dragging) onStampHover(null);
        drag.dragging = true;
        const beadPoint = toBeadCoords(e.clientX, e.clientY);
        if (beadPoint) {
          setSelectionRect({
            x: Math.min(drag.startBead.x, beadPoint.x),
            y: Math.min(drag.startBead.y, beadPoint.y),
            w: Math.abs(beadPoint.x - drag.startBead.x),
            h: Math.abs(beadPoint.y - drag.startBead.y),
          });
        }
      }
      return;
    }
    if (stampPattern) {
      if (shouldThrottleHoverSearch()) return;
      const beadPoint = toBeadCoords(e.clientX, e.clientY);
      const nearest = beadPoint ? findNearestNode(beadPoint) : null;
      onStampHover(nearest?.id ?? null);
    }
  }, [active, toBeadCoords, stampPattern, findNearestNode, onStampHover, isMultiTouch, shouldThrottleHoverSearch]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!active || isMultiTouch()) return;
    const drag = stampDragRef.current;
    stampDragRef.current = null;
    if (!drag) return;

    if (drag.mode === 'movePreview') {
      const beadPoint = toBeadCoords(e.clientX, e.clientY) ?? drag.startBead;
      const nearest = findNearestNode(beadPoint);
      if (nearest) onStampPlace(nearest.id);
      return;
    }

    if (drag.dragging) {
      const beadPoint = toBeadCoords(e.clientX, e.clientY) ?? drag.startBead;
      const minX = Math.min(drag.startBead.x, beadPoint.x);
      const maxX = Math.max(drag.startBead.x, beadPoint.x);
      const minY = Math.min(drag.startBead.y, beadPoint.y);
      const maxY = Math.max(drag.startBead.y, beadPoint.y);
      const ids = beads
        .filter(b => b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY)
        .map(b => b.id);
      setSelectionRect(null);
      onStampSelect(ids);
      return;
    }

    if (stampPattern) {
      const nearest = findNearestNode(drag.startBead);
      if (nearest) onStampPlace(nearest.id);
    }
  }, [active, toBeadCoords, beads, onStampSelect, stampPattern, findNearestNode, onStampPlace, isMultiTouch]);

  // Сбрасывает начатый драг/выделение без трогания превью штампа — нужно
  // отдельно от handlePointerLeave для отмены вторым пальцем (см.
  // cancelActiveStroke в CanvasView.tsx): там второй палец переключает
  // жест на панораму/zoom, но живой hover-превью штампа не обязан гаснуть.
  const cancel = useCallback(() => {
    stampDragRef.current = null;
    setSelectionRect(null);
  }, []);

  const handlePointerLeave = useCallback(() => {
    cancel();
    onStampHover(null);
  }, [cancel, onStampHover]);

  return {
    selectionRect, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, cancel,
  };
};
