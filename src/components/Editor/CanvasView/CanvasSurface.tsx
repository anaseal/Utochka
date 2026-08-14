import { ReactNode } from 'react';
import { DrawingTool } from '../../../hooks/useDrawing';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { isStrokeTool } from '../../../utils/tools';

// Внешняя оболочка холста, общая для всех четырёх техник: модификаторы курсора
// по активному инструменту, двупальцевый жест и разводка pointer-событий между
// рисованием, режимом плетения и коммитом нитки.

// Модификатор курсора/поведения по инструменту. Инструменты протяжки
// (карандаш/ластик) своего класса не имеют — у них курсор по умолчанию.
const TOOL_MODIFIER: Partial<Record<DrawingTool, string>> = {
  'flood-fill': 'flood-fill',
  stamp: 'stamp',
  'pendant-chain': 'chain',
  thread: 'thread',
  hole: 'hole',
  'hole-segment': 'hole',
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
        if (!weaveMode) return;
        // Правая кнопка в режиме плетения означает «снять проход», и снимает
        // его обработчик contextmenu холста. Гасим её здесь, не пуская дальше:
        // иначе pointerdown дошёл бы до бисерины и пометил сегмент, а
        // contextmenu тут же снял бы отметку — правый клик выглядел бы
        // бездействием, и вдобавок клал бы в историю два мазка вместо одного.
        if (e.button === 2) {
          e.stopPropagation();
          return;
        }
        // Мазок плетения стартует в CAPTURE-фазе: pointerdown бисерины (bubble)
        // срабатывает раньше pointerdown контейнера, и без этого первый
        // weaveTouch клика шёл со старым набором задетых бисерин прошлого
        // мазка — общие с прошлым сегментом молча выпадали, а повторный клик
        // по тому же сегменту не делал ничего. Заодно отметки ложатся после
        // снимка истории, а не до него.
        //
        // !isMultiTouch() — иначе второй палец (старт пинча/панорамы поверх
        // уже идущего мазка) тоже доходит сюда и вызывает onWeaveStrokeStart()
        // ЕЩЁ РАЗ поверх мазка первого пальца, стирая strokeSeenRef и
        // preStrokeRef середины мазка (см. useWeaveCanvas/useWeaveProgress) —
        // то, что первый палец успел отметить до касания вторым, беззвучно
        // терялось: endStroke() на конце жеста видел пустой stroke и ничего
        // не коммитил в state.
        if (!touchGesture.isMultiTouch()) onWeaveStrokeStart();
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
