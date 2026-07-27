import { RefObject } from 'react';
import { useCanvasScrollbars } from '../../../hooks/useCanvasScrollbars';

interface CanvasScrollbarsProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

// Тач-скроллбар холста — общий для CanvasView и CrossWeaveCanvasView (см.
// spec.md, раздел 4.2: механики, осмысленные для обеих техник, живут здесь,
// а не копиями в теле холста). Рендерится внутри .canvas__svg-frame — та же
// позиционирующая обёртка, что и у .span-controls-toggle (CanvasView.tsx):
// размер в точности как у .canvas__svg, но без overflow:auto, поэтому
// бегунок лежит поверх карточки, не уезжая при скролле сетки бисерин.
export const CanvasScrollbars = ({ containerRef }: CanvasScrollbarsProps) => {
  const { x, y, beginDrag } = useCanvasScrollbars(containerRef);

  return (
    <>
      {x.visible && (
        <div className="canvas-scrollbar canvas-scrollbar--x" aria-hidden="true">
          <div
            className="canvas-scrollbar__thumb"
            style={{ width: `${x.thumbSize}px`, transform: `translateX(${x.thumbOffset}px)` }}
            onPointerDown={(e) => beginDrag('x', e)}
          />
        </div>
      )}
      {y.visible && (
        <div className="canvas-scrollbar canvas-scrollbar--y" aria-hidden="true">
          <div
            className="canvas-scrollbar__thumb"
            style={{ height: `${y.thumbSize}px`, transform: `translateY(${y.thumbOffset}px)` }}
            onPointerDown={(e) => beginDrag('y', e)}
          />
        </div>
      )}
    </>
  );
};
