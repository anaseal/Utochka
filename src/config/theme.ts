/**
 * ТЕМА И КОНФИГУРАЦИЯ СИСТЕМЫ
 * Здесь хранятся только те параметры, которые влияют на расчеты 
 * или требуются в JS/TS коде. Визуальное оформление вынесено в index.css.
 */

export const BEAD_THEME = {
  // Геометрические параметры бисерин (используются в расчетах генератора)
  sizes: {
    nodeRadius: 6.5,
    spanRadius: 6,
    hitboxRadius: 11, // Расширенная область клика
  },

  // Цвета по умолчанию
  colors: {
    nodeDefault: '#a5bdcf', // Cyan-400
    spanDefault: '#d6e2e9', // Fuchsia-400
    background: '#1e293b',  // Slate-800
  },

  // Параметры сетки
  gridDefaults: {
    spacing: 65,
    beadsInSpan: 3,
    initialWidth: 10,
    initialHeight: 4,
    // Новые константы для унификации логики
    verticalCompression: 0.25,
    horizontalStepMultiplier: 1.2,
    offsetX: 160,
    offsetY: 50,
  }
};