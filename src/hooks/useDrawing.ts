import { useState, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { BEAD_THEME } from '../config/theme';
import { usePersistedState } from './usePersistedState';
import { PendantPlacement, PendantChain } from '../types/pendant';
import { Thread } from '../types/thread';

const MAX_HISTORY = 30;
const RECENT_LIMIT = BEAD_THEME.ui.recentColorsLimit;
const HEX_RE = /^#[0-9a-f]{6}$/i;

const isDesignMap = (v: unknown): v is Record<string, string> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(c => typeof c === 'string');
};

export type DrawingTool = 'pencil' | 'eraser' | 'flood-fill' | 'stamp' | 'pendant-chain' | 'thread';

// Единица истории: снимок сетки, подвесок, цепочек-подвесок И ниток разом —
// один Undo/Redo откатывает все четыре состояния синхронно (они рисуются
// одним мазком/жестом, например заливка может задеть сетку, подвеску и
// цепочку разом).
interface HistorySnapshot {
  designMap: Record<string, string>;
  pendants: PendantPlacement[];
  chains: PendantChain[];
  threads: Thread[];
}

export const useDrawing = (
  initialColor: string,
  basePalette: readonly string[],
  pendantPlacements: PendantPlacement[],
  setPendantPlacements: Dispatch<SetStateAction<PendantPlacement[]>>,
  pendantChains: PendantChain[],
  setPendantChains: Dispatch<SetStateAction<PendantChain[]>>,
  threads: Thread[],
  setThreads: Dispatch<SetStateAction<Thread[]>>,
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

  const preStrokeRef = useRef<HistorySnapshot>({ designMap: {}, pendants: [], chains: [], threads: [] });

  const pushSnapshot = useCallback((snapshot: HistorySnapshot) => {
    setPast(prev => {
      const next = [...prev, snapshot];
      return next.length > MAX_HISTORY ? next.slice(1) : next;
    });
    setFuture([]);
  }, []);

  const startDrawing = useCallback(() => {
    preStrokeRef.current = { designMap, pendants: pendantPlacements, chains: pendantChains, threads };
    setIsDrawing(true);
  }, [designMap, pendantPlacements, pendantChains, threads]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      const pre = preStrokeRef.current;
      if (
        pre.designMap !== designMap || pre.pendants !== pendantPlacements ||
        pre.chains !== pendantChains || pre.threads !== threads
      ) {
        pushSnapshot(pre);
      }
    }
    setIsDrawing(false);
  }, [isDrawing, designMap, pendantPlacements, pendantChains, threads, pushSnapshot]);

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
    const hasChainColors = pendantChains.some(c => Object.keys(c.colorMap).length > 0);
    if (!hasDesign && !hasPendantColors && !hasChainColors) return;
    pushSnapshot({ designMap, pendants: pendantPlacements, chains: pendantChains, threads });
    if (hasDesign) setDesignMap({});
    if (hasPendantColors) {
      setPendantPlacements(prev => prev.map(p => (
        Object.keys(p.colorMap).length === 0 ? p : { ...p, colorMap: {} }
      )));
    }
    if (hasChainColors) {
      setPendantChains(prev => prev.map(c => (
        Object.keys(c.colorMap).length === 0 ? c : { ...c, colorMap: {} }
      )));
    }
  }, [designMap, pendantPlacements, pendantChains, threads, pushSnapshot, setPendantPlacements, setPendantChains]);

  // Управляемая трансформация Design Map (например, пересчёт при смене ширины).
  // Снимок сохраняется в историю — результат можно отменить через Undo.
  const remapDesignMap = useCallback((
    fn: (m: Record<string, string>) => Record<string, string>,
  ) => {
    const next = fn(designMap);
    if (next === designMap) return;
    pushSnapshot({ designMap, pendants: pendantPlacements, chains: pendantChains, threads });
    setDesignMap(next);
  }, [designMap, pendantPlacements, pendantChains, threads, pushSnapshot]);

  // Одновременное изменение сетки, подвесок, цепочек И ниток одним шагом
  // истории (например, заливка, которая может задеть обычные бусины, бусины
  // подвески и бусины цепочки за один клик; нитка коммитится тем же путём —
  // целиком на pointerup, см. ThreadLayer/CanvasView).
  const applyPatch = useCallback((
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: ((p: PendantPlacement[]) => PendantPlacement[]) | null,
    chainsFn: ((c: PendantChain[]) => PendantChain[]) | null = null,
    threadsFn: ((t: Thread[]) => Thread[]) | null = null,
  ) => {
    const nextDesignMap = designMapFn ? designMapFn(designMap) : designMap;
    const nextPendants = pendantsFn ? pendantsFn(pendantPlacements) : pendantPlacements;
    const nextChains = chainsFn ? chainsFn(pendantChains) : pendantChains;
    const nextThreads = threadsFn ? threadsFn(threads) : threads;
    if (
      nextDesignMap === designMap && nextPendants === pendantPlacements &&
      nextChains === pendantChains && nextThreads === threads
    ) return;
    pushSnapshot({ designMap, pendants: pendantPlacements, chains: pendantChains, threads });
    if (nextDesignMap !== designMap) setDesignMap(nextDesignMap);
    if (nextPendants !== pendantPlacements) setPendantPlacements(nextPendants);
    if (nextChains !== pendantChains) setPendantChains(nextChains);
    if (nextThreads !== threads) setThreads(nextThreads);
  }, [
    designMap, pendantPlacements, pendantChains, threads,
    pushSnapshot, setPendantPlacements, setPendantChains, setThreads,
  ]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    setFuture(f => [{ designMap, pendants: pendantPlacements, chains: pendantChains, threads }, ...f]);
    const snapshot = past[past.length - 1];
    setDesignMap(snapshot.designMap);
    setPendantPlacements(snapshot.pendants);
    setPendantChains(snapshot.chains);
    setThreads(snapshot.threads);
    setPast(p => p.slice(0, -1));
  }, [past, designMap, pendantPlacements, pendantChains, threads, setPendantPlacements, setPendantChains, setThreads]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setPast(p => [...p, { designMap, pendants: pendantPlacements, chains: pendantChains, threads }]);
    const snapshot = future[0];
    setDesignMap(snapshot.designMap);
    setPendantPlacements(snapshot.pendants);
    setPendantChains(snapshot.chains);
    setThreads(snapshot.threads);
    setFuture(f => f.slice(1));
  }, [future, designMap, pendantPlacements, pendantChains, threads, setPendantPlacements, setPendantChains, setThreads]);

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
