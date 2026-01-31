import { useState, useCallback } from 'react';

export const useDrawing = (initialColor: string) => {
  const [activeColor, setActiveColor] = useState(initialColor);
  const [designMap, setDesignMap] = useState<Map<string, string>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);

  const paintBead = useCallback((id: string) => {
    setDesignMap((prev) => {
      if (prev.get(id) === activeColor) return prev;
      const next = new Map(prev);
      next.set(id, activeColor);
      return next;
    });
  }, [activeColor]);

  const startDrawing = useCallback(() => setIsDrawing(true), []);
  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  return {
    activeColor,
    setActiveColor,
    designMap,
    isDrawing,
    paintBead,
    startDrawing,
    stopDrawing,
  };
};