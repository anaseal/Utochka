export interface LoomBead {
  id: string;
  x: number;
  y: number;
  logicalIndex: { row: number; col: number };
}

// Loom: прямоугольная сетка без сдвига рядов вообще (в отличие от Peyote —
// там нечётные ряды сдвинуты на pitchX/2) — все ряды одной ширины и в одной
// фазе, поэтому, как и у Peyote, нет различия «логических» и «сырых»
// размеров генератора (см. PeyoteGridConfig). pitchY здесь сознательно нет:
// выводится из pitchX формулой pitchYFromX (config/loomTheme.ts).
export interface LoomGridConfig {
  width: number;
  height: number;
  pitchX: number;
}
