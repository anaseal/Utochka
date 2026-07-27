import { RefObject, useCallback } from 'react';

/**
 * Переводит client-координаты указателя в локальную систему координат группы,
 * которая совпадает с bead.x/y — без ручного учёта zoom, отступов и матрицы
 * режима плетения (поворот/отражение полотна): getScreenCTM группы уже
 * включает в себя все родительские трансформации.
 */
export const useBeadCoords = (
  groupRef: RefObject<SVGGElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
) => useCallback((clientX: number, clientY: number) => {
  const g = groupRef.current;
  const svg = svgRef.current;
  if (!g || !svg) return null;
  const ctm = g.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}, [groupRef, svgRef]);

export type ToBeadCoords = ReturnType<typeof useBeadCoords>;
