// Общая арифметика mirror-aware изменения ширины — переиспользуется
// useSilyankaProject.ts и useCrossWeaveProject.ts. В Mirror Mode колонки
// добавляются/убираются симметрично парами (по одной с каждой стороны),
// поэтому caller получает newWidth и per-side mirrorDelta для сдвига
// designMap/подвесок; вне Mirror Mode mirrorDelta всегда 0.
//
// maxWidth — верхняя граница в тех же (сырых) единицах, что и currentWidth;
// caller отвечает за перевод из отображаемых панелью чисел (см.
// APP_CONSTRAINTS.maxGridWidth в theme.ts).

export interface WidthResizeResult {
  newWidth: number;
  mirrorDelta: number;
}

export const resizeWidthRelative = (
  currentWidth: number,
  delta: number,
  mirrorMode: boolean,
  maxWidth: number,
): WidthResizeResult | null => {
  if (mirrorMode) {
    const newWidth = currentWidth + delta * 2;
    if (newWidth < 1 || newWidth > maxWidth || newWidth === currentWidth) return null;
    return { newWidth, mirrorDelta: delta };
  }
  const newWidth = Math.min(maxWidth, Math.max(1, currentWidth + delta));
  if (newWidth === currentWidth) return null;
  return { newWidth, mirrorDelta: 0 };
};

export const resizeWidthAbsolute = (
  currentWidth: number,
  target: number,
  mirrorMode: boolean,
  maxWidth: number,
): WidthResizeResult | null => {
  const rounded = Math.min(maxWidth, Math.max(1, Math.round(target)));
  if (mirrorMode) {
    let newWidth = rounded;
    let diff = newWidth - currentWidth;
    // Нечётную разницу округляем до чётной, чтобы сохранить центровку рисунка;
    // если округление вверх упёрлось бы в maxWidth — округляем вниз вместо этого.
    if (diff % 2 !== 0) {
      if (newWidth + 1 > maxWidth) {
        newWidth -= 1;
        diff -= 1;
      } else {
        newWidth += 1;
        diff += 1;
      }
    }
    if (newWidth === currentWidth) return null;
    return { newWidth, mirrorDelta: diff / 2 };
  }
  if (rounded === currentWidth) return null;
  return { newWidth: rounded, mirrorDelta: 0 };
};
