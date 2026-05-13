import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 30;

export const useDrawing = (initialColor: string) => {
  const [activeColor, setActiveColor] = useState(initialColor);
  const [designMap, setDesignMap] = useState<Record<string, string>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [past, setPast] = useState<Record<string, string>[]>([]);
  const [future, setFuture] = useState<Record<string, string>[]>([]);

  const preStrokeRef = useRef<Record<string, string>>({});

  const startDrawing = useCallback(() => {
    preStrokeRef.current = designMap;
    setIsDrawing(true);
  }, [designMap]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && designMap !== preStrokeRef.current) {
      setPast(prev => {
        const next = [...prev, preStrokeRef.current];
        return next.length > MAX_HISTORY ? next.slice(1) : next;
      });
      setFuture([]);
    }
    setIsDrawing(false);
  }, [isDrawing, designMap]);

  const paintBead = useCallback((id: string) => {
    setDesignMap((prev) => ({
      ...prev,
      [id]: activeColor
    }));
  }, [activeColor]);

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
    designMap,
    isDrawing,
    paintBead,
    startDrawing,
    stopDrawing,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
};
