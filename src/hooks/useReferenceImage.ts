import { useCallback, useEffect, useRef, useState } from 'react';
import { usePersistedState } from './usePersistedState';
import { getImage, putImage, deleteImage } from '../utils/referenceImageDb';
import { REFERENCE_WINDOW } from '../config/theme';
import { clamp } from '../utils/clamp';

interface Position { x: number; y: number }
interface Size { w: number; h: number }

const isPosition = (v: unknown): v is Position =>
  typeof v === 'object' && v !== null &&
  typeof (v as Position).x === 'number' && typeof (v as Position).y === 'number';

const isSize = (v: unknown): v is Size =>
  typeof v === 'object' && v !== null &&
  typeof (v as Size).w === 'number' && typeof (v as Size).h === 'number';

const isZoom = (v: unknown): v is number =>
  typeof v === 'number' && v >= REFERENCE_WINDOW.minZoom && v <= REFERENCE_WINDOW.maxZoom;

const defaultPosition = (): Position => ({
  x: Math.max(24, window.innerWidth - REFERENCE_WINDOW.defaultWidth - 24),
  y: 88,
});

// Downscale через canvas: длинная сторона ≈2000px, JPEG q≈0.85 — чтобы не
// раздувать IndexedDB оригиналами со смартфонов (10-20 МБ).
const downscaleToJpeg = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, REFERENCE_WINDOW.downscaleMaxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      REFERENCE_WINDOW.jpegQuality,
    );
  });
};

// Хук состояния Reference Window — картинка (IndexedDB) + позиция/размер/зум
// окна (localStorage). Подключается внутри самого ReferenceWindow, а не в
// App: position/size/zoom меняются на каждый pointermove/wheel/resize, и
// если бы это состояние жило в App, каждое такое событие перерисовывало бы
// всё дерево (включая CanvasView с сотнями бисерин) — App знает только
// про `open`, нужный Header для подсветки кнопки-тумблера.
export const useReferenceImage = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPersistError, setHasPersistError] = useState(false);
  const imageUrlRef = useRef<string | null>(null);

  const [position, setPosition] = usePersistedState<Position>(
    'app:referenceWindow:position', defaultPosition(), isPosition,
  );
  const [size, setSize] = usePersistedState<Size>(
    'app:referenceWindow:size',
    { w: REFERENCE_WINDOW.defaultWidth, h: REFERENCE_WINDOW.defaultHeight },
    isSize,
  );
  const [zoom, setZoom] = usePersistedState<number>('app:referenceWindow:zoom', 1, isZoom);

  const applyImageUrl = useCallback((url: string | null) => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    imageUrlRef.current = url;
    setImageUrl(url);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await getImage();
        if (cancelled) return;
        if (blob) applyImageUrl(URL.createObjectURL(blob));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const blob = await downscaleToJpeg(file);
      applyImageUrl(URL.createObjectURL(blob));
      try {
        await putImage(blob);
        setHasPersistError(false);
      } catch {
        setHasPersistError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyImageUrl]);

  const removeImage = useCallback(async () => {
    applyImageUrl(null);
    setHasPersistError(false);
    try {
      await deleteImage();
    } catch {
      // некуда откатывать — картинки в памяти уже нет
    }
  }, [applyImageUrl]);

  const setZoomClamped = useCallback((updater: number | ((z: number) => number)) => {
    setZoom((prev) => {
      const next = typeof updater === 'function' ? (updater as (z: number) => number)(prev) : updater;
      return clamp(next, REFERENCE_WINDOW.minZoom, REFERENCE_WINDOW.maxZoom);
    });
  }, [setZoom]);

  return {
    imageUrl, isLoading, hasPersistError, uploadImage, removeImage,
    position, setPosition,
    size, setSize,
    zoom, setZoom: setZoomClamped,
  };
};
