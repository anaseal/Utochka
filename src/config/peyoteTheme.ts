export const PEYOTE_THEME = {
  // Прямоугольная бисерина (Delica): рендерится РОВНО в размер шага сетки
  // (pitchX × pitchY, см. PeyoteCanvasView.tsx/PeyoteBeadView.tsx) — никаких
  // отдельных «визуальных» размеров, которые могли бы разъехаться с шагом:
  // именно так пейот выглядит физически — бисерины стоят вплотную друг к
  // другу без зазора (в отличие от crossWeave/RAW, где зазор — открытая нить
  // между бисеринами, там beadMinorRadius/beadMajorRadius сознательно меньше
  // pitchX/pitchY). rowPitchRatio — во сколько раз шаг между рядами (pitchY)
  // больше шага внутри ряда (pitchX): держит бисерину прямоугольной (уже, чем
  // выше), а не квадратной, на любом значении Spacing. cornerRadius —
  // небольшое скругление углов, чтобы прямоугольники не выглядели как чистые
  // пиксели растра.
  sizes: {
    rowPitchRatio: 1.3,
    cornerRadius: 3,
    hitboxRadius: 13,
  },

  colors: {
    beadDefault: 'transparent',
  },

  gridDefaults: {
    initialWidth: 20,
    initialHeight: 30,
    // spacing = pitchX; pitchY выводится через pitchYFromX(spacing) —
    // единственный источник правды, см. комментарий там же.
    spacing: 20,
  },

  constraints: {
    minSpacing: 16,
    maxSpacing: 28,
    spacingStep: 1,
  },
};

export const defaultColorForPeyote = (): string => PEYOTE_THEME.colors.beadDefault;

// Единственное место, где pitchY получается из pitchX — используется и при
// инициализации/изменении Spacing (usePeyoteProject.ts), и везде, где нужен
// реальный шаг по Y (генератор сетки, рендер бисерины, иконка техники).
// Дублировать pitchY отдельным полем состояния не нужно (и опасно — именно
// рассинхрон отдельно хранимых pitchY и визуального размера бисерины раньше
// давал зазор/наезд бисерин друг на друга): вместо этого он всегда считается
// из pitchX по этой формуле.
export const pitchYFromX = (pitchX: number): number =>
  Math.round(pitchX * PEYOTE_THEME.sizes.rowPitchRatio);
