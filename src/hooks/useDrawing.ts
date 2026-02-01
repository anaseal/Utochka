import { useState, useCallback } from 'react';

export const useDrawing = (initialColor: string) => {
  const [activeColor, setActiveColor] = useState(initialColor);
  const [designMap, setDesignMap] = useState<Map<string, string>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = useCallback(() => setIsDrawing(true), []);
  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const paintBead = useCallback((id: string) => {
    setDesignMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, activeColor);
      return newMap;
    });
  }, [activeColor]);

  return {
    activeColor,
    setActiveColor,
    designMap,
    isDrawing,
    paintBead,
    startDrawing,
    stopDrawing
  };
};