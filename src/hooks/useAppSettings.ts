import { useCallback, useState } from 'react';
import { usePersistedState } from './usePersistedState';
import { Technique } from '../components/Editor/Header/Header.types';
import { APP_CONSTRAINTS } from '../config/theme';
import { clamp } from '../utils/clamp';
import { isPaletteColors } from '../utils/projectPalette';

export const DEFAULT_PALETTE = ['#ff4757', '#ffd32a', '#22d3ee', '#e879f9', '#ffffff'];

const isZoom = (v: unknown): v is number =>
  typeof v === 'number' && v >= APP_CONSTRAINTS.minZoom && v <= APP_CONSTRAINTS.maxZoom;

const isTechnique = (v: unknown): v is Technique =>
  v === 'silyanka' || v === 'crossWeave' || v === 'peyote' || v === 'loom';

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const isCanvasTheme = (v: unknown): v is 'dark' | 'light' => v === 'dark' || v === 'light';

// Персистентные настройки, общие для всего приложения (не привязаны к
// конкретной технике и не относятся к режиму плетения — см. useWeaveModePanel).
export const useAppSettings = () => {
  const [technique, setTechnique] = usePersistedState<Technique>('app:technique', 'silyanka', isTechnique);
  const [zoom, setZoom] = usePersistedState<number>('app:zoom', 1, isZoom);
  const [palette, setPalette] = usePersistedState<string[]>('app:palette', DEFAULT_PALETTE, isPaletteColors);
  const [canvasTheme, setCanvasTheme] = usePersistedState<'dark' | 'light'>(
    'app:canvasTheme', 'dark', isCanvasTheme,
  );
  const [referenceOpen, setReferenceOpen] = usePersistedState<boolean>(
    'app:referenceWindow:open', false, isBoolean,
  );

  // Свёрнутый хедер — настройка ландшафтного телефона: там высоты ~350–430px,
  // и полная строка съедает её пятую часть. Персистится, как и открытость
  // окна образца: свернул один раз — работает свёрнутым, пока сам не вернёт.
  // Хранится общим `app:`-ключом, а не per-технику: это свойство экрана, а не
  // схемы. Действует только в ландшафтном медиа-запросе (Header.css) —
  // в портрете строка нужна целиком, и флаг там ничего не меняет.
  const [headerCollapsed, setHeaderCollapsed] = usePersistedState<boolean>(
    'app:headerCollapsed', false, isBoolean,
  );

  // Приветственное окно (WelcomeDialog.tsx). Персистится не «открыто ли оно»
  // (как у referenceOpen выше), а только факт «человек его уже видел»:
  // открывается оно само ровно один раз, на первом запуске, а дальше — по
  // кнопке «?» в хедере. Отсюда и обычный useState для самой открытости:
  // восстанавливать окно открытым после перезагрузки незачем.
  const [welcomeSeen, setWelcomeSeen] = usePersistedState<boolean>(
    'app:welcomeSeen', false, isBoolean,
  );
  const [welcomeOpen, setWelcomeOpen] = useState(!welcomeSeen);

  const openWelcome = useCallback(() => setWelcomeOpen(true), []);

  // Отметка «видел» ставится на закрытии, а не на показе: закрыть окно можно
  // только осознанно (кнопка, Escape, клик по фону), и до этого момента оно
  // должно вернуться, если вкладку перезагрузили на полпути.
  const closeWelcome = useCallback(() => {
    setWelcomeOpen(false);
    setWelcomeSeen(true);
  }, [setWelcomeSeen]);

  const updateZoom = useCallback((delta: number) => {
    setZoom(prev => clamp(prev + delta, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom));
  }, [setZoom]);

  const setZoomAbsolute = useCallback((v: number) => {
    setZoom(clamp(v, APP_CONSTRAINTS.minZoom, APP_CONSTRAINTS.maxZoom));
  }, [setZoom]);

  const toggleCanvasTheme = useCallback(() => {
    setCanvasTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, [setCanvasTheme]);

  const toggleHeaderCollapsed = useCallback(() => {
    setHeaderCollapsed(v => !v);
  }, [setHeaderCollapsed]);

  return {
    technique, setTechnique,
    zoom, updateZoom, setZoomAbsolute,
    palette, setPalette,
    canvasTheme, toggleCanvasTheme,
    referenceOpen, setReferenceOpen,
    headerCollapsed, toggleHeaderCollapsed,
    welcomeOpen, openWelcome, closeWelcome,
  };
};

export type AppSettings = ReturnType<typeof useAppSettings>;
