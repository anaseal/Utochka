import { useState, useCallback } from 'react';

export const useDrawing = (initialColor: string) => {
  const [activeColor, setActiveColor] = useState(initialColor);
  // Заменяем Map на Record для упрощения сериализации и обновлений
  const [designMap, setDesignMap] = useState<Record<string, string>>({});
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = useCallback(() => setIsDrawing(true), []);
  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const paintBead = useCallback((id: string) => {
    setDesignMap((prev) => ({
      ...prev,
      [id]: activeColor
    }));
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