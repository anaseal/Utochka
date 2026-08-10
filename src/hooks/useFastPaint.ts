/* FILE: src\hooks\useFastPaint.ts */
import { useCallback } from 'react';
import { useMirrorPaint } from './useMirrorPaint';
import { effectiveBeadColor, isUnfilledBead } from '../config/theme';

interface UseFastPaintOptions {
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  paintBeadFast: (id: string) => string | undefined;
  mirrorMode: boolean;
  mirrorFn: (id: string) => string | null;
  // Цвет незакрашенной бисерины — своя логика геометрии на каждый холст
  // (силянка различает NODE/SPAN по классу, у крестика тип один), поэтому
  // не хардкодится здесь, а приходит снаружи (см. CanvasView.tsx/
  // CrossWeaveCanvasView.tsx).
  defaultColorOf: (beadEl: HTMLElement) => string;
}

// Красит одну бисерину напрямую в DOM, в обход React — используется только
// во время протяжки (см. paintBeadFast/strokeChangesRef в useDrawing.ts).
// Держит в синхроне ровно то, что рендерит BeadView/CrossWeaveBeadView по
// тем же данным: fill/--bead-color и класс bead--empty. Прозрачный цвет
// проходит через те же isUnfilledBead/effectiveBeadColor, что и React-рендер,
// поэтому мазок прозрачным сразу выглядит как незакрашенная бисерина, а не
// как невидимая (см. BeadView.css).
export const useFastPaint = ({ canvasSvgRef, paintBeadFast, mirrorMode, mirrorFn, defaultColorOf }: UseFastPaintOptions) => {
  const applyBeadColorDom = useCallback((id: string, color: string | undefined) => {
    const svg = canvasSvgRef.current;
    const g = svg?.ownerDocument.getElementById(id);
    if (!g) return;
    g.classList.toggle('bead--empty', isUnfilledBead(color));
    const body = g.querySelector('.bead__body') as SVGElement | null;
    if (!body) return;
    const finalColor = effectiveBeadColor(color, defaultColorOf(g));
    body.setAttribute('fill', finalColor);
    body.style.setProperty('--bead-color', finalColor);
  }, [canvasSvgRef, defaultColorOf]);

  const paintBeadFastAndDom = useCallback((id: string) => {
    applyBeadColorDom(id, paintBeadFast(id));
  }, [paintBeadFast, applyBeadColorDom]);

  return useMirrorPaint(paintBeadFastAndDom, mirrorMode, mirrorFn);
};
