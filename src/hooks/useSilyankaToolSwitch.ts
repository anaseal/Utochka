import { DrawingTool } from './useDrawing';
import { SilyankaProject } from './useSilyankaProject';

// Обёртка над сменой инструмента в силянке — переключение тула по клику или
// по хоткею должно идти одним и тем же путём, поэтому обе точки входа
// (Header/PendantsSidebar и useEditorKeyboardShortcuts) используют этот хук.
export const useSilyankaToolSwitch = (silyanka: SilyankaProject) => {
  // Уход с инструмента «штамп» сбрасывает захваченный узор — иначе при
  // следующем заходе в штамп сразу показывается старый preview и мешает
  // заново выделить область (см. cancelStampPattern ниже — тот же сброс).
  const setSilyankaTool = (tool: DrawingTool) => {
    if (silyanka.drawingControls.activeTool === 'stamp' && tool !== 'stamp') {
      silyanka.setStampPattern(null);
      silyanka.setStampHoverNodeId(null);
    }
    // Уход с инструмента выбора узлов цепочки сбрасывает незавершённый выбор
    // начала — иначе следующий заход в инструмент сразу считал бы старый узел
    // отмеченным.
    if (silyanka.drawingControls.activeTool === 'pendant-chain' && tool !== 'pendant-chain') {
      silyanka.setChainPendingStart(null);
    }
    silyanka.drawingControls.setActiveTool(tool);
  };

  // То же самое, что Escape/Alt (см. useEditorKeyboardShortcuts) — общий сброс
  // захваченного узора штампа, доступный и с клавиатуры, и с тач-экрана
  // (кнопка-крестик у Stamp в Header, см. hasStampPattern/onCancelStampPattern).
  const cancelStampPattern = () => {
    silyanka.setStampPattern(null);
    silyanka.setStampHoverNodeId(null);
  };

  return { setSilyankaTool, cancelStampPattern };
};
