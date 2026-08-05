export const LOOM_THEME = {
  // Прямоугольная бисерина встык (уже, чем выше): рендерится РОВНО в размер
  // шага сетки (pitchX × pitchY, см. LoomCanvasView.tsx/LoomBeadView.tsx) —
  // тот же приём, что у Peyote (никаких отдельных «визуальных» размеров,
  // которые могли бы разъехаться с шагом). rowPitchRatio = 1.3 — тот же
  // коэффициент, что у Peyote, хотя причина там другая (у Peyote вытянутая
  // форма нужна для прочтения кирпичной кладки при сдвиге рядов; у Loom рядов
  // без сдвига, форма — просто визуальный выбор, не квадрат). cornerRadius —
  // то же небольшое скругление углов, что у Peyote.
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

export const defaultColorForLoom = (): string => LOOM_THEME.colors.beadDefault;

// Единственное место, где pitchY получается из pitchX — см. комментарий у
// одноимённой функции в config/peyoteTheme.ts. Единственный источник правды:
// хранить pitchY отдельным полем состояния значит рисковать рассинхроном
// шага сетки и визуального размера бисерины.
export const pitchYFromX = (pitchX: number): number =>
  Math.round(pitchX * LOOM_THEME.sizes.rowPitchRatio);
