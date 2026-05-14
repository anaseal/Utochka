import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 30;

export type DrawingTool = 'pencil' | 'eraser';

export const useDrawing = (initialColor: string) => {
  const [activeColor, setActiveColor] = useState(initialColor);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pencil');
  const [designMap, setDesignMap] = useState<Record<string, string>>({});
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
    activeTool,
    setActiveTool,
    designMap,
    isDrawing,
    paintBead,
    startDrawing,
    stopDrawing,
    clearAll,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
};
