export const KRESTIK_THEME = {
  // Радиусы овала: minor — короткая полуось, major — длинная. Для
  // вертикальной бисерины rx=minor/ry=major, для горизонтальной — наоборот.
  sizes: {
    beadMinorRadius: 8,
    beadMajorRadius: 9,
    hitboxRadius: 13,
  },

  colors: {
    beadDefault: 'transparent',
  },

  gridDefaults: {
    // width/height здесь — «логические» размеры (число колонн/рядов, как их
    // подписывает линейка), а не сырые параметры генератора. Перевод в сырые
    // параметры — см. toRawDimensions в useKrestikProject.ts.
    initialWidth: 30,
    initialHeight: 15,
    // spacing = pitchX = pitchY: расстояние между соседними овалами внутри
    // ряда (pitchX) и между рядами одинаковой ориентации (pitchY —
    // генератор сам делит его пополам на шаг между соседними рядами).
    spacing: 30,
  },

  constraints: {
    minSpacing: 28,
    maxSpacing: 40,
    spacingStep: 2,
  },
};

export const defaultColorForKrestik = (): string => KRESTIK_THEME.colors.beadDefault;
