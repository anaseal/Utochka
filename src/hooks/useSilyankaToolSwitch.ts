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
    // То же самое для зубца — независимый незавершённый выбор, см.
    // toothPendingStart в useSilyankaProject.ts.
    if (silyanka.drawingControls.activeTool === 'tooth' && tool !== 'tooth') {
      silyanka.setToothPendingStart(null);
    }
    // Уход с «Hole segment» сбрасывает наведённый предпросмотр — иначе при
    // следующем заходе в инструмент сразу показывался бы предпросмотр по
    // ноде, наведённой в прошлый раз, без реального наведения курсора.
    if (silyanka.drawingControls.activeTool === 'hole-segment' && tool !== 'hole-segment') {
      silyanka.setHoleSegmentHoverNodeId(null);
    }
    // Bead и Segment делят один список пометок «на удаление» (см.
    // pendingDeleteIds в useSilyankaProject.ts) — переключение МЕЖДУ ними
    // список не трогает (можно набирать общую пачку то одним, то другим
    // инструментом), но уход в любой ДРУГОЙ инструмент (карандаш и т.д.) или
    // Escape список сбрасывает без подтверждения — как и незавершённый выбор
    // штампа/цепочки выше, непросмотренные пометки не должны молча пережить
    // выход из режима.
    const HOLE_TOOLS: DrawingTool[] = ['hole', 'hole-segment'];
    if (HOLE_TOOLS.includes(silyanka.drawingControls.activeTool) && !HOLE_TOOLS.includes(tool)) {
      silyanka.clearPendingDelete();
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
