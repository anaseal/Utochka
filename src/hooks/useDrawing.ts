import { useState, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { BEAD_THEME } from '../config/theme';
import { usePersistedState } from './usePersistedState';
import { PendantPlacement } from '../types/pendant';

const MAX_HISTORY = 30;
const RECENT_LIMIT = BEAD_THEME.ui.recentColorsLimit;
const HEX_RE = /^#[0-9a-f]{6}$/i;

const isDesignMap = (v: unknown): v is Record<string, string> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(c => typeof c === 'string');
};

export type DrawingTool = 'pencil' | 'eraser' | 'flood-fill' | 'stamp';

// Единица истории: снимок сетки И подвесок разом — один Undo/Redo
// откатывает оба состояния синхронно (они рисуются одним мазком/жестом).
interface HistorySnapshot {
  designMap: Record<string, string>;
  pendants: PendantPlacement[];
}

export const useDrawing = (
  initialColor: string,
  basePalette: readonly string[],
  pendantPlacements: PendantPlacement[],
  setPendantPlacements: Dispatch<SetStateAction<PendantPlacement[]>>,
  storageNamespace: string,
) => {
  const recentStorageKey = `${storageNamespace}:recentColors`;
  const designStorageKey = `${storageNamespace}:designMap`;

  const [activeColor, setActiveColorState] = useState(initialColor);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pencil');
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(recentStorageKey);
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
      try { localStorage.setItem(recentStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [basePalette, recentStorageKey]);
  const [designMap, setDesignMap] = usePersistedState<Record<string, string>>(
    designStorageKey, {}, isDesignMap,
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  const preStrokeRef = useRef<HistorySnapshot>({ designMap: {}, pendants: [] });

  const pushSnapshot = useCallback((snapshot: HistorySnapshot) => {
    setPast(prev => {
      const next = [...prev, snapshot];
      return next.length > MAX_HISTORY ? next.slice(1) : next;
    });
    setFuture([]);
  }, []);

  const startDrawing = useCallback(() => {
    preStrokeRef.current = { designMap, pendants: pendantPlacements };
    setIsDrawing(true);
  }, [designMap, pendantPlacements]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      const pre = preStrokeRef.current;
      if (pre.designMap !== designMap || pre.pendants !== pendantPlacements) {
        pushSnapshot(pre);
      }
    }
    setIsDrawing(false);
  }, [isDrawing, designMap, pendantPlacements, pushSnapshot]);

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
    const hasDesign = Object.keys(designMap).length > 0;
    const hasPendantColors = pendantPlacements.some(p => Object.keys(p.colorMap).length > 0);
    if (!hasDesign && !hasPendantColors) return;
    pushSnapshot({ designMap, pendants: pendantPlacements });
    if (hasDesign) setDesignMap({});
    if (hasPendantColors) {
      setPendantPlacements(prev => prev.map(p => (
        Object.keys(p.colorMap).length === 0 ? p : { ...p, colorMap: {} }
      )));
    }
  }, [designMap, pendantPlacements, pushSnapshot, setPendantPlacements]);

  // Управляемая трансформация Design Map (например, пересчёт при смене ширины).
  // Снимок сохраняется в историю — результат можно отменить через Undo.
  const remapDesignMap = useCallback((
    fn: (m: Record<string, string>) => Record<string, string>,
  ) => {
    const next = fn(designMap);
    if (next === designMap) return;
    pushSnapshot({ designMap, pendants: pendantPlacements });
    setDesignMap(next);
  }, [designMap, pendantPlacements, pushSnapshot]);

  // Одновременное изменение сетки И подвесок одним шагом истории (например, заливка,
  // которая может задеть и обычные бусины, и бусины подвесок за один клик).
  const applyPatch = useCallback((
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: ((p: PendantPlacement[]) => PendantPlacement[]) | null,
  ) => {
    const nextDesignMap = designMapFn ? designMapFn(designMap) : designMap;
    const nextPendants = pendantsFn ? pendantsFn(pendantPlacements) : pendantPlacements;
    if (nextDesignMap === designMap && nextPendants === pendantPlacements) return;
    pushSnapshot({ designMap, pendants: pendantPlacements });
    if (nextDesignMap !== designMap) setDesignMap(nextDesignMap);
    if (nextPendants !== pendantPlacements) setPendantPlacements(nextPendants);
  }, [designMap, pendantPlacements, pushSnapshot, setPendantPlacements]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    setFuture(f => [{ designMap, pendants: pendantPlacements }, ...f]);
    const snapshot = past[past.length - 1];
    setDesignMap(snapshot.designMap);
    setPendantPlacements(snapshot.pendants);
    setPast(p => p.slice(0, -1));
  }, [past, designMap, pendantPlacements, setPendantPlacements]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setPast(p => [...p, { designMap, pendants: pendantPlacements }]);
    const snapshot = future[0];
    setDesignMap(snapshot.designMap);
    setPendantPlacements(snapshot.pendants);
    setFuture(f => f.slice(1));
  }, [future, designMap, pendantPlacements, setPendantPlacements]);

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
    applyPatch,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
};
