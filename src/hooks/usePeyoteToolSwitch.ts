import { DrawingTool } from './useDrawing';
import { PeyoteProject } from './usePeyoteProject';

// Обёртка над сменой инструмента в Peyote — по образцу useSilyankaToolSwitch,
// но без chain/tooth/hole (их у Peyote нет): единственное, что нужно
// сбрасывать при уходе с инструмента, это захваченный узор штампа.
export const usePeyoteToolSwitch = (peyote: PeyoteProject) => {
  // Уход с инструмента «штамп» сбрасывает захваченный узор — иначе при
  // следующем заходе в штамп сразу показывается старый preview и мешает
  // заново выделить область (см. cancelPeyoteStampPattern ниже — тот же сброс).
  const setPeyoteTool = (tool: DrawingTool) => {
    if (peyote.drawingControls.activeTool === 'stamp' && tool !== 'stamp') {
      peyote.setStampPattern(null);
      peyote.setStampHoverNodeId(null);
    }
    peyote.drawingControls.setActiveTool(tool);
  };

  // То же самое, что Escape/Alt (см. useEditorKeyboardShortcuts) — общий сброс
  // захваченного узора штампа, доступный и с клавиатуры, и с тач-экрана.
  const cancelPeyoteStampPattern = () => {
    peyote.setStampPattern(null);
    peyote.setStampHoverNodeId(null);
  };

  return { setPeyoteTool, cancelPeyoteStampPattern };
};
