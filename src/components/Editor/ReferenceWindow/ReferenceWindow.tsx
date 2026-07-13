import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import './ReferenceWindow.css';
import { REFERENCE_WINDOW } from '../../../config/theme';
import { clamp } from '../../../utils/clamp';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useReferenceImage } from '../../../hooks/useReferenceImage';

// Совпадает с max-width/max-height окна в ReferenceWindow.css (90vw/90vh) —
// граница для ручного resize-хэндла, который считает размер в px из viewport.
const MAX_SIZE_VIEWPORT_RATIO = 0.9;

interface ReferenceWindowProps {
  open: boolean;
  setOpen: (updater: boolean | ((v: boolean) => boolean)) => void;
}

export const ReferenceWindow = ({ open, setOpen }: ReferenceWindowProps) => {
  const {
    imageUrl, isLoading, hasPersistError, uploadImage, removeImage,
    position, setPosition, size, setSize, zoom, setZoom,
    collapsed, setCollapsed,
  } = useReferenceImage();

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  // Во время драга/резайза координаты пишутся напрямую в DOM (минуя React
  // state и persisted localStorage) — иначе каждый pointermove/resize-тик
  // гонял бы React-рендер и синхронную запись в localStorage. В стейт
  // коммитим только финальное значение (pointerup / debounce после resize).
  const dragRef = useRef<{ dx: number; dy: number; last: { x: number; y: number } } | null>(null);
  const resizeDragRef = useRef<{ startW: number; startH: number; startX: number; startY: number; last: { w: number; h: number } } | null>(null);
  const resizeTimeoutRef = useRef<number | undefined>(undefined);

  useWheelZoom(viewportRef, (delta) => setZoom((z) => z + delta));

  // Позиция — абсолютные px, персистятся в localStorage и не пересчитываются
  // сами при ресайзе (в отличие от size, которую держит в рамках vw/vh CSS
  // max-width/max-height). Если окно утащили к правому краю на широком
  // мониторе, а потом открыли страницу на 1024px — оно окажется полностью
  // за пределами экрана и станет недостижимо (хватать нечем, шапка тоже
  // за краем). Клэмпим в те же границы, что и drag (60/40 — минимум
  // столько шапки остаётся на экране, чтобы было за что ухватить).
  useEffect(() => {
    if (!open) return;
    const clampToViewport = () => {
      setPosition((prev) => {
        const maxX = Math.max(0, window.innerWidth - 60);
        const maxY = Math.max(0, window.innerHeight - 40);
        const x = Math.min(Math.max(0, prev.x), maxX);
        const y = Math.min(Math.max(0, prev.y), maxY);
        return x === prev.x && y === prev.y ? prev : { x, y };
      });
    };
    clampToViewport();
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, [open, setPosition]);

  useEffect(() => {
    const root = rootRef.current;
    // Свёрнутое окно схлопывается до высоты одной шапки (см. .reference-window--collapsed
    // в CSS) — это не пользовательский ресайз, и коммитить такую высоту в
    // persisted size нельзя, иначе после разворачивания окно останется маленьким.
    if (!root || !open || collapsed) return;
    const commitSize = () => {
      // getBoundingClientRect() отдаёт border-box размер, совпадающий с тем,
      // что задают CSS-переменные --ref-w/--ref-h (box-sizing: border-box из
      // Tailwind preflight) — в отличие от entry.contentRect (content-box),
      // который меньше на толщину border и раскачивал окно в петлю
      // самоуменьшения при каждом рендере.
      const rect = root.getBoundingClientRect();
      setSize((prev) => (
        Math.abs(prev.w - rect.width) < 1 && Math.abs(prev.h - rect.height) < 1
          ? prev
          : { w: Math.round(rect.width), h: Math.round(rect.height) }
      ));
    };
    const observer = new ResizeObserver(() => {
      // Сам ресайз браузер уже отрисовал нативно (resize: both задаёт inline
      // width/height напрямую) — здесь только синхронизируем state/localStorage
      // для восстановления после перезагрузки, поэтому не нужно делать это на
      // каждый промежуточный тик.
      window.clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = window.setTimeout(commitSize, 200);
    });
    observer.observe(root);
    return () => {
      window.clearTimeout(resizeTimeoutRef.current);
      observer.disconnect();
    };
  }, [open, collapsed, setSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - position.x, dy: e.clientY - position.y, last: position };
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const maxX = Math.max(0, window.innerWidth - 60);
    const maxY = Math.max(0, window.innerHeight - 40);
    const x = Math.min(Math.max(0, e.clientX - drag.dx), maxX);
    const y = Math.min(Math.max(0, e.clientY - drag.dy), maxY);
    drag.last = { x, y };
    const root = rootRef.current;
    if (root) {
      root.style.setProperty('--ref-x', `${x}px`);
      root.style.setProperty('--ref-y', `${y}px`);
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag) setPosition(drag.last);
  }, [setPosition]);

  // Собственный resize-хэндл поверх Pointer Events вместо нативного CSS
  // `resize: both` — тот управляется только мышью и не откликается на тач
  // ни на Android, ни на iOS, поэтому на мобильном окно нельзя было уменьшить.
  // Тот же приём "пишем в DOM во время драга, коммитим в state на pointerup",
  // что и у перетаскивания шапки (handlePointerMove/Up выше).
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeDragRef.current = { startW: size.w, startH: size.h, startX: e.clientX, startY: e.clientY, last: size };
  }, [size]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = resizeDragRef.current;
    if (!drag) return;
    const maxW = window.innerWidth * MAX_SIZE_VIEWPORT_RATIO;
    const maxH = window.innerHeight * MAX_SIZE_VIEWPORT_RATIO;
    const w = clamp(drag.startW + (e.clientX - drag.startX), REFERENCE_WINDOW.minWidth, maxW);
    const h = clamp(drag.startH + (e.clientY - drag.startY), REFERENCE_WINDOW.minHeight, maxH);
    drag.last = { w, h };
    const root = rootRef.current;
    if (root) {
      root.style.setProperty('--ref-w', `${w}px`);
      root.style.setProperty('--ref-h', `${h}px`);
    }
  }, []);

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const drag = resizeDragRef.current;
    resizeDragRef.current = null;
    if (drag) setSize(drag.last);
  }, [setSize]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  };

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className={`reference-window${collapsed ? ' reference-window--collapsed' : ''}`}
      style={{
        '--ref-x': `${position.x}px`,
        '--ref-y': `${position.y}px`,
        '--ref-w': `${size.w}px`,
        '--ref-h': `${size.h}px`,
      } as React.CSSProperties}
    >
      <div
        className="reference-window__header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="reference-window__title">Reference</span>
        {imageUrl && !collapsed && (
          <div className="reference-window__zoom-controls">
            <button type="button" className="reference-window__icon-btn" onClick={() => setZoom((z) => z - REFERENCE_WINDOW.zoomStep)} title="Zoom out">
              <Minus size={12} />
            </button>
            <span className="reference-window__zoom-value">{Math.round(zoom * 100)}%</span>
            <button type="button" className="reference-window__icon-btn" onClick={() => setZoom((z) => z + REFERENCE_WINDOW.zoomStep)} title="Zoom in">
              <Plus size={12} />
            </button>
          </div>
        )}
        <button
          type="button"
          className="reference-window__icon-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          aria-label={collapsed ? 'Expand reference window' : 'Collapse reference window'}
          aria-pressed={collapsed}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          type="button"
          className="reference-window__icon-btn reference-window__close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          title="Close"
          aria-label="Close reference window"
        >
          <X size={14} />
        </button>
      </div>

      {!collapsed && (
        <>
          {hasPersistError && (
            <div className="reference-window__warning">
              Картинка не сохранена — пропадёт при перезагрузке страницы
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="reference-window__file-input"
            onChange={handleFileChange}
          />

          {isLoading ? (
            <div className="reference-window__empty">Загрузка…</div>
          ) : imageUrl ? (
            <>
              <div ref={viewportRef} className="reference-window__viewport">
                <img
                  src={imageUrl}
                  alt="Reference"
                  className="reference-window__image"
                  style={{ '--ref-zoom': zoom } as React.CSSProperties}
                  draggable={false}
                />
              </div>
              <div className="reference-window__footer">
                <button type="button" className="reference-window__text-btn" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={12} /> Заменить
                </button>
                <button type="button" className="reference-window__text-btn" onClick={removeImage}>
                  <Trash2 size={12} /> Убрать
                </button>
              </div>
            </>
          ) : (
            <div
              className={`reference-window__dropzone${isDropTarget ? ' reference-window__dropzone--active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDropTarget(true); }}
              onDragLeave={() => setIsDropTarget(false)}
              onDrop={handleDrop}
            >
              <p>Перетащите картинку сюда</p>
              <button type="button" className="reference-window__text-btn" onClick={() => fileInputRef.current?.click()}>
                <Upload size={12} /> Выбрать файл
              </button>
            </div>
          )}

          <div
            className="reference-window__resize-handle"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            title="Resize"
          />
        </>
      )}
    </div>
  );
};
