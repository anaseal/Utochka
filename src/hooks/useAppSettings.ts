import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';
import { Technique } from '../components/Editor/Header/Header.types';
import { APP_CONSTRAINTS } from '../config/theme';
import { clamp } from '../utils/clamp';

export const DEFAULT_PALETTE = ['#ff4757', '#ffd32a', '#22d3ee', '#e879f9', '#ffffff'];

const isZoom = (v: unknown): v is number =>
  typeof v === 'number' && v >= APP_CONSTRAINTS.minZoom && v <= APP_CONSTRAINTS.maxZoom;

const isTechnique = (v: unknown): v is Technique => v === 'silyanka' || v === 'crossWeave' || v === 'peyote';

const isPalette = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c));

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const isCanvasTheme = (v: unknown): v is 'dark' | 'light' => v === 'dark' || v === 'light';

// Персистентные настройки, общие для всего приложения (не привязаны к
// конкретной технике и не относятся к режиму плетения — см. useWeaveModePanel).
export const useAppSettings = () => {
  const [technique, setTechnique] = usePersistedState<Technique>('app:technique', 'silyanka', isTechnique);
  const [zoom, setZoom] = usePersistedState<number>('app:zoom', 1, isZoom);
  const [palette, setPalette] = usePersistedState<string[]>('app:palette', DEFAULT_PALETTE, isPalette);
  const [canvasTheme, setCanvasTheme] = usePersistedState<'dark' | 'light'>(
    'app:canvasTheme', 'dark', isCanvasTheme,
  );
  const [referenceOpen, setReferenceOpen] = usePersistedState<boolean>(
    'app:referenceWindow:open', false, isBoolean,
  );

  const updateZoom = useCallback((delta: number) => {
    setZoom(prev => clamp(prev + delta, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom));
  }, [setZoom]);

  const setZoomAbsolute = useCallback((v: number) => {
    setZoom(clamp(v, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom));
  }, [setZoom]);

  const toggleCanvasTheme = useCallback(() => {
    setCanvasTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, [setCanvasTheme]);

  return {
    technique, setTechnique,
    zoom, updateZoom, setZoomAbsolute,
    palette, setPalette,
    canvasTheme, toggleCanvasTheme,
    referenceOpen, setReferenceOpen,
  };
};

export type AppSettings = ReturnType<typeof useAppSettings>;
