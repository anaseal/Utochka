import { ReactNode } from 'react';
import { DrawingTool } from '../../../hooks/useDrawing';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { isStrokeTool } from '../../../utils/tools';

// Внешняя оболочка холста, общая для обеих техник: модификаторы курсора по
// активному инструменту, двупальцевый жест и разводка pointer-событий между
// рисованием, режимом плетения и коммитом нитки. Раньше висела двумя
// дословными копиями в CanvasView и CrossWeaveCanvasView.

// Модификатор курсора/поведения по инструменту. Инструменты протяжки
// (карандаш/ластик) своего класса не имеют — у них курсор по умолчанию.
const TOOL_MODIFIER: Partial<Record<DrawingTool, string>> = {
  'flood-fill': 'flood-fill',
  stamp: 'stamp',
  'pendant-chain': 'chain',
  thread: 'thread',
};

interface CanvasSurfaceProps {
  canvasTheme: 'dark' | 'light';
  activeTool: DrawingTool;
  weaveMode: boolean;
  /** Место, зарезервированное под панель материалов (см. useStatsReserve). */
  statsReserve: number;
  touchGesture: ReturnType<typeof useTouchPanZoom>;
  startDrawing: () => void;
  stopDrawing: () => void;
  onWeaveStrokeStart: () => void;
  onWeaveStrokeEnd: () => void;
  onCommitThreadTrace: () => void;
  children: ReactNode;
}

export const CanvasSurface = ({
  canvasTheme,
  activeTool,
  weaveMode,
  statsReserve,
  touchGesture,
  startDrawing,
  stopDrawing,
  onWeaveStrokeStart,
  onWeaveStrokeEnd,
  onCommitThreadTrace,
  children,
}: CanvasSurfaceProps) => {
  const modifier = TOOL_MODIFIER[activeTool];
  const className = [
    'editor__viewport',
    weaveMode ? 'editor__viewport--weave' : '',
    modifier ? `editor__viewport--${modifier}` : '',
  ].filter(Boolean).join(' ');

  // Отпускание/отмена/уход указателя закрывают мазок одинаково — в режиме
  // плетения мазок отметок, иначе мазок рисования.
  const endStroke = (e: React.PointerEvent) => {
    touchGesture.releasePointer(e);
    if (weaveMode) {
      onWeaveStrokeEnd();
      return;
    }
    if (isStrokeTool(activeTool)) stopDrawing();
  };

  return (
    <main
      data-canvas-theme={canvasTheme}
      className={className}
      style={{ '--stats-reserve': `${statsReserve}px` } as React.CSSProperties}
      onPointerDownCapture={(e) => {
        touchGesture.onPointerDownCapture(e);
        // Мазок плетения стартует в CAPTURE-фазе: pointerdown бисерины (bubble)
        // срабатывает раньше pointerdown контейнера, и без этого первый
        // weaveTouch клика шёл со старым набором задетых бисерин прошлого
        // мазка — общие с прошлым сегментом молча выпадали, а повторный клик
        // по тому же сегменту не делал ничего. Заодно отметки ложатся после
        // снимка истории, а не до него.
        if (weaveMode) onWeaveStrokeStart();
      }}
      onPointerMove={touchGesture.onPointerMove}
      onPointerDown={() => {
        if (weaveMode) return;
        if (isStrokeTool(activeTool)) startDrawing();
      }}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
      onDoubleClick={() => { if (!weaveMode && activeTool === 'thread') onCommitThreadTrace(); }}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </main>
  );
};
