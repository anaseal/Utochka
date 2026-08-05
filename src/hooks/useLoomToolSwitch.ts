import { DrawingTool } from './useDrawing';
import { LoomProject } from './useLoomProject';

// Обёртка над сменой инструмента в Loom — по образцу usePeyoteToolSwitch, но
// без chain/tooth/hole (их у Loom нет): единственное, что нужно сбрасывать
// при уходе с инструмента, это захваченный узор штампа.
export const useLoomToolSwitch = (loom: LoomProject) => {
  // Уход с инструмента «штамп» сбрасывает захваченный узор — иначе при
  // следующем заходе в штамп сразу показывается старый preview и мешает
  // заново выделить область (см. cancelLoomStampPattern ниже — тот же сброс).
  const setLoomTool = (tool: DrawingTool) => {
    if (loom.drawingControls.activeTool === 'stamp' && tool !== 'stamp') {
      loom.setStampPattern(null);
      loom.setStampHoverNodeId(null);
    }
    loom.drawingControls.setActiveTool(tool);
  };

  // То же самое, что Escape/Alt (см. useEditorKeyboardShortcuts) — общий сброс
  // захваченного узора штампа, доступный и с клавиатуры, и с тач-экрана.
  const cancelLoomStampPattern = () => {
    loom.setStampPattern(null);
    loom.setStampHoverNodeId(null);
  };

  return { setLoomTool, cancelLoomStampPattern };
};
