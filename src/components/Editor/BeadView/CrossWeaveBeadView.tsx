/* FILE: src\components\Editor\BeadView\CrossWeaveBeadView.tsx */
import { memo } from 'react';
import { BeadOrientation } from '../../../types/crossWeaveBead';
import { CROSS_WEAVE_THEME } from '../../../config/crossWeaveTheme';
import './BeadView.css';

interface CrossWeaveBeadViewProps {
  id: string;
  x: number;
  y: number;
  orientation: BeadOrientation;
  color?: string;
  defaultColor: string;
  highlighted?: boolean;
  onPointerDown: (id: string) => void;
  onPointerEnter: (id: string) => void;
}

export const CrossWeaveBeadView = memo(({
  id,
  x,
  y,
  orientation,
  color,
  defaultColor,
  highlighted,
  onPointerDown,
  onPointerEnter,
}: CrossWeaveBeadViewProps) => {
  const isEmpty = !color;
  const finalColor = color || defaultColor;

  const { beadMinorRadius, beadMajorRadius, hitboxRadius } = CROSS_WEAVE_THEME.sizes;
  const rx = orientation === 'vertical' ? beadMinorRadius : beadMajorRadius;
  const ry = orientation === 'vertical' ? beadMajorRadius : beadMinorRadius;

  return (
    <g
      className={`bead bead--type-span${isEmpty ? ' bead--empty' : ''}`}
      onPointerEnter={() => onPointerEnter(id)}
      onPointerDown={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        onPointerDown(id);
      }}
    >
      <ellipse
        className="bead__hitbox"
        cx={x}
        cy={y}
        rx={hitboxRadius}
        ry={hitboxRadius}
      />
      {highlighted && (
        <ellipse
          className="bead__highlight"
          cx={x}
          cy={y}
          rx={rx + 3.5}
          ry={ry + 3.5}
          pointerEvents="none"
        />
      )}
      <ellipse
        className="bead__body"
        cx={x}
        cy={y}
        rx={rx}
        ry={ry}
        fill={finalColor}
        style={{ '--bead-color': finalColor } as React.CSSProperties}
      />
    </g>
  );
});

CrossWeaveBeadView.displayName = 'CrossWeaveBeadView';
