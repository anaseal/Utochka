import { useState, useCallback, useRef } from 'react';
import { BEAD_THEME } from '../config/theme';
import { usePersistedState } from './usePersistedState';

const MAX_HISTORY = 30;
const RECENT_LIMIT = BEAD_THEME.ui.recentColorsLimit;
const RECENT_STORAGE_KEY = 'silyanka:recentColors';
const DESIGN_STORAGE_KEY = 'silyanka:designMap';
const HEX_RE = /^#[0-9a-f]{6}$/i;

const isDesignMap = (v: unknown): v is Record<string, string> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(c => typeof c === 'string');
};

export type DrawingTool = 'pencil' | 'eraser' | 'flood-fill';

export const useDrawing = (initialColor: string, basePalette: readonly string[]) => {
  const [activeColor, setActiveColorState] = useState(initialColor);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pencil');
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((c): c is string => typeof c === 'string' && HEX_RE.test(c))
        .slice(0, RECENT_LIMIT);
    } catch {
      return [];
    }
  });

  const setActiveColor = useCallback((color: string) => {
    setActiveColorState(color);
  }, []);

  const commitRecentColor = useCallback((color: string) => {
    if (!HEX_RE.test(color)) return;
    if (basePalette.includes(color)) return;
    setRecentColors(prev => {
      if (prev[0] === color) return prev;
      const next = [color, ...prev.filter(c => c !== color)].slice(0, RECENT_LIMIT);
      try { localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [basePalette]);
  const [designMap, setDesignMap] = usePersistedState<Record<string, string>>(
    DESIGN_STORAGE_KEY, {}, isDesignMap,
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [past, setPast] = useState<Record<string, string>[]>([]);
  const [future, setFuture] = useState<Record<string, string>[]>([]);

  const preStrokeRef = useRef<Record<string, string>>({});

  const pushSnapshot = useCallback((snapshot: Record<string, string>) => {
    setPast(prev => {
      const next = [...prev, snapshot];
      return next.length > MAX_HISTORY ? next.slice(1) : next;
    });
    setFuture([]);
  }, []);

  const startDrawing = useCallback(() => {
    preStrokeRef.current = designMap;
    setIsDrawing(true);
  }, [designMap]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && designMap !== preStrokeRef.current) {
      pushSnapshot(preStrokeRef.current);
    }
    setIsDrawing(false);
  }, [isDrawing, designMap, pushSnapshot]);

  const paintBead = useCallback((id: string) => {
    if (activeTool === 'eraser') {
      setDesignMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setDesignMap((prev) => ({
        ...prev,
        [id]: activeColor
      }));
    }
  }, [activeColor, activeTool]);

  const clearAll = useCallback(() => {
    if (Object.keys(designMap).length === 0) return;
    pushSnapshot(designMap);
    setDesignMap({});
  }, [designMap, pushSnapshot]);

  // Управляемая трансформация Design Map (например, пересчёт при смене ширины).
  // Снимок сохраняется в историю — результат можно отменить через Undo.
  const remapDesignMap = useCallback((
    fn: (m: Record<string, string>) => Record<string, string>,
  ) => {
    const next = fn(designMap);
    if (next === designMap) return;
    pushSnapshot(designMap);
    setDesignMap(next);
  }, [designMap, pushSnapshot]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    setFuture(f => [designMap, ...f]);
    setDesignMap(past[past.length - 1]);
    setPast(p => p.slice(0, -1));
  }, [past, designMap]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setPast(p => [...p, designMap]);
    setDesignMap(future[0]);
    setFuture(f => f.slice(1));
  }, [future, designMap]);

  return {
    activeColor,
    setActiveColor,
    commitRecentColor,
    activeTool,
    setActiveTool,
    recentColors,
    designMap,
    isDrawing,
    paintBead,
    startDrawing,
    stopDrawing,
    clearAll,
    remapDesignMap,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
};
