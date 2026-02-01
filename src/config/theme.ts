/**
 * ТЕМА И КОНФИГУРАЦИЯ СИСТЕМЫ
 * Здесь хранятся только те параметры, которые влияют на расчеты 
 * или требуются в JS/TS коде. Визуальное оформление вынесено в index.css.
 */

export const BEAD_THEME = {
  // Геометрические параметры бисерин (используются в расчетах генератора)
  // r=7 для узла и r=6 для пролета согласно ТЗ
  sizes: {
    nodeRadius: 7,
    spanRadius: 6,
    hitboxRadius: 11, // Расширенная область клика
  },

  // Цвета по умолчанию (используются для инициализации и в логике CanvasView)
  colors: {
    nodeDefault: '#22d3ee', // Cyan-400
    spanDefault: '#e879f9', // Fuchsia-400
    background: '#1e293b',  // Slate-800
  },

  // Параметры сетки по умолчанию
  gridDefaults: {
    spacing: 65,
    beadsInSpan: 6,
    initialWidth: 8,
    initialHeight: 10,
  }
};