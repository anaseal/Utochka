import { useEffect, RefObject } from 'react';

// Ctrl+wheel zoom холста — общий для CanvasView и CrossWeaveCanvasView.
export const useWheelZoom = (
  containerRef: RefObject<HTMLDivElement | null>,
  onZoomChange: (delta: number) => void,
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        onZoomChange(-e.deltaY * 0.005);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, onZoomChange]);
};
