// Размер SVG-холста по бисеринам — общая формула для CanvasView и
// CrossWeaveCanvasView (margin=30 по умолчанию). extraMaxY нужен силянке —
// подвески могут свисать ниже нижней бисерины сетки.
export interface CanvasDimOptions {
  margin?: number;
  extraMaxY?: number;
}

export const computeCanvasDim = (
  beads: { x: number; y: number }[],
  offsetX: number,
  offsetY: number,
  radius: number,
  opts?: CanvasDimOptions,
): { w: number; h: number; shiftX: number } => {
  if (beads.length === 0) return { w: 100, h: 100, shiftX: 0 };

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of beads) {
    if (b.x < minX) minX = b.x;
    if (b.x > maxX) maxX = b.x;
    if (b.y > maxY) maxY = b.y;
  }

  const margin = opts?.margin ?? 30;
  const effectiveMaxY = Math.max(maxY, opts?.extraMaxY ?? 0);
  // Нечётные ряды силянки могут заходить левее x=0 (см. spec.md) — добавляем
  // столько же места и в перевод (translate), и в ширину холста, иначе новые
  // крайние бисерины наезжали бы на панель линейки слева.
  const shiftX = Math.max(0, -minX);
  return {
    w: maxX + shiftX + offsetX + radius + margin,
    h: effectiveMaxY + offsetY + radius + margin,
    shiftX,
  };
};
