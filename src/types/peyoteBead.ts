export interface PeyoteBead {
  id: string;
  x: number;
  y: number;
  logicalIndex: { row: number; col: number };
}

// width/height здесь — уже те самые размеры, что подписывает PeyoteRulers:
// в отличие от CrossWeaveGridConfig, у Peyote нет разницы между «логическими»
// и «сырыми» размерами генератора — все ряды одной ширины (см. spec.md).
// pitchY здесь сознательно нет: он всегда выводится из pitchX формулой
// pitchYFromX (config/peyoteTheme.ts) — хранить его отдельным полем состояния
// значит рисковать рассинхроном шага сетки и визуального размера бисерины
// (см. комментарий там же).
export interface PeyoteGridConfig {
  width: number;
  height: number;
  pitchX: number;
}
