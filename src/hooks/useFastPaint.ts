/* FILE: src\hooks\useFastPaint.ts */
import { useCallback } from 'react';
import { defaultColorFor } from '../config/theme';
import { useMirrorPaint } from './useMirrorPaint';

interface UseFastPaintOptions {
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  paintBeadFast: (id: string) => string | undefined;
  mirrorMode: boolean;
  mirrorFn: (id: string) => string | null;
}

// Красит одну бисерину напрямую в DOM, в обход React — используется только
// во время протяжки (см. paintBeadFast/strokeChangesRef в useDrawing.ts).
// Держит в синхроне ровно то, что рендерит BeadView по тем же данным:
// fill/--bead-color и класс bead--empty (см. BeadView.tsx/BeadView.css).
export const useFastPaint = ({ canvasSvgRef, paintBeadFast, mirrorMode, mirrorFn }: UseFastPaintOptions) => {
  const applyBeadColorDom = useCallback((id: string, color: string | undefined) => {
    const svg = canvasSvgRef.current;
    const g = svg?.ownerDocument.getElementById(id);
    if (!g) return;
    g.classList.toggle('bead--empty', !color);
    const body = g.querySelector('.bead__body') as SVGCircleElement | null;
    if (!body) return;
    const finalColor = color ?? defaultColorFor(g.classList.contains('bead--type-node') ? 'NODE' : 'SPAN');
    body.setAttribute('fill', finalColor);
    body.style.setProperty('--bead-color', finalColor);
  }, [canvasSvgRef]);

  const paintBeadFastAndDom = useCallback((id: string) => {
    applyBeadColorDom(id, paintBeadFast(id));
  }, [paintBeadFast, applyBeadColorDom]);

  return useMirrorPaint(paintBeadFastAndDom, mirrorMode, mirrorFn);
};
