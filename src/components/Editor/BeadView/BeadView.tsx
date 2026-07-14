/* FILE: src\components\Editor\BeadView\BeadView.tsx */
import { memo } from 'react';
import { BeadType } from '../../../types/bead';
import { BEAD_THEME } from '../../../config/theme'; // Импортируем тему
import './BeadView.css';

interface BeadViewProps {
  id: string;
  x: number;
  y: number;
  type: BeadType;
  color?: string;
  defaultColor: string;
  highlighted?: boolean;
  // Цвет-«призрак» превью штампа в текущей наведённой позиции — рисуется
  // поверх реального цвета полупрозрачным пунктиром, чтобы был виден готовый
  // рисунок, а не просто подсвеченный контур (см. spec.md, «Штамп»).
  previewColor?: string;
  onPointerDown: (id: string) => void;
  onPointerEnter: (id: string) => void;
}

export const BeadView = memo(({
  id,
  x,
  y,
  type,
  color,
  defaultColor,
  highlighted,
  previewColor,
  onPointerDown,
  onPointerEnter
}: BeadViewProps) => {
  const isNode = type === 'NODE';
  const isEmpty = !color;
  const finalColor = color || defaultColor;

  const { nodeRadius, spanRadius, hitboxRadius } = BEAD_THEME.sizes;

  return (
    <g
      className={`bead ${isNode ? 'bead--type-node' : 'bead--type-span'}${isEmpty ? ' bead--empty' : ''}`}
      onPointerEnter={() => onPointerEnter(id)}
      onPointerDown={(e) => {
        // Отключает implicit pointer capture на тач-устройствах: без этого
        // touchmove продолжает таргетить бусину, на которой было касание,
        // и onPointerEnter соседних бусин никогда не срабатывает при проводке
        // пальцем — рисование линией на мобильном не работало бы вовсе.
        // Важно снимать capture именно с e.target (реально захваченный
        // элемент — вложенный <circle>), а не e.currentTarget (<g>,
        // на котором висит обработчик): у него capture никогда не было,
        // и releasePointerCapture на нём молча ничего не делает.
        if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
        onPointerDown(id);
      }}
    >
      <circle
        className="bead__hitbox"
        cx={x}
        cy={y}
        r={hitboxRadius}
      />
      {highlighted && (
        <circle
          className="bead__highlight"
          cx={x}
          cy={y}
          r={(isNode ? nodeRadius : spanRadius) + 3.5}
          pointerEvents="none"
        />
      )}
      <circle
        className="bead__body"
        cx={x}
        cy={y}
        r={isNode ? nodeRadius : spanRadius}
        fill={finalColor}
        style={{ '--bead-color': finalColor } as React.CSSProperties}
      />
      {previewColor && (
        <circle
          className="bead__preview"
          cx={x}
          cy={y}
          r={isNode ? nodeRadius : spanRadius}
          fill={previewColor}
          pointerEvents="none"
        />
      )}
    </g>
  );
});

BeadView.displayName = 'BeadView';