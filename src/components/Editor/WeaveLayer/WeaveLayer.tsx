import { useMemo } from 'react';
import './WeaveLayer.css';

/** Где стоит бисерина и какого она размера — общий вид для обеих техник. */
export type WeaveBeadPositions = Map<string, { x: number; y: number; r: number }>;

interface WeaveLayerProps {
  positions: WeaveBeadPositions;
  /** Последний отмеченный сегмент — обводится рамкой «здесь я остановилась». */
  lastSegment: string[];
  active: boolean;
  /** Рамка показывается только по кнопке Locate, на пару секунд (см. App). */
  showLast: boolean;
}

// Слой отметок режима плетения поверх сетки. Само приглушение проплетённого
// делает класс на бисерине (useWeaveMarks) — здесь только рамка вокруг
// последнего сегмента. Кратность проходов хранится в модели (useWeaveProgress),
// но на холсте не отображается: точки/кольца повторных проходов зашумляли
// схему, потому что соседние сегменты всегда делят бисерины.
export const WeaveLayer = ({ positions, lastSegment, active, showLast }: WeaveLayerProps) => {
  const lastFrame = useMemo(() => {
    if (!active || !showLast || lastSegment.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const id of lastSegment) {
      const pos = positions.get(id);
      if (!pos) continue;
      const r = pos.r + 3;
      minX = Math.min(minX, pos.x - r);
      maxX = Math.max(maxX, pos.x + r);
      minY = Math.min(minY, pos.y - r);
      maxY = Math.max(maxY, pos.y + r);
    }
    if (minX === Infinity) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [active, showLast, lastSegment, positions]);

  if (!active || !lastFrame) return null;

  return (
    <g className="weave-layer" pointerEvents="none">
      <rect
        className="weave-layer__last"
        x={lastFrame.x}
        y={lastFrame.y}
        width={lastFrame.w}
        height={lastFrame.h}
        rx={5}
      />
    </g>
  );
};
