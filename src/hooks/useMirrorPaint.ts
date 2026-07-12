import { useCallback } from 'react';

// paintBead + поиск зеркальной пары — общий паттерн для CanvasView и
// CrossWeaveCanvasView. Конкретная mirror-функция (своя геометрия у каждой
// техники) передаётся снаружи уже забинженной на нужные аргументы.
export const useMirrorPaint = (
  paintBead: (id: string) => void,
  mirrorMode: boolean,
  mirrorFn: (id: string) => string | null,
) => {
  return useCallback((id: string) => {
    paintBead(id);
    if (mirrorMode) {
      const m = mirrorFn(id);
      if (m !== null && m !== id) paintBead(m);
    }
  }, [paintBead, mirrorMode, mirrorFn]);
};
