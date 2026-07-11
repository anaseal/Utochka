/* FILE: src\components\Editor\BeadView\KrestikBeadView.tsx */
import { memo } from 'react';
import { BeadOrientation } from '../../../types/krestikBead';
import { KRESTIK_THEME } from '../../../config/krestikTheme';
import './BeadView.css';

interface KrestikBeadViewProps {
  id: string;
  x: number;
  y: number;
  orientation: BeadOrientation;
  color?: string;
  defaultColor: string;
  highlighted?: boolean;
  onMouseDown: (id: string) => void;
  onMouseEnter: (id: string) => void;
}

export const KrestikBeadView = memo(({
  id,
  x,
  y,
  orientation,
  color,
  defaultColor,
  highlighted,
  onMouseDown,
  onMouseEnter,
}: KrestikBeadViewProps) => {
  const isEmpty = !color;
  const finalColor = color || defaultColor;

  const { beadMinorRadius, beadMajorRadius, hitboxRadius } = KRESTIK_THEME.sizes;
  const rx = orientation === 'vertical' ? beadMinorRadius : beadMajorRadius;
  const ry = orientation === 'vertical' ? beadMajorRadius : beadMinorRadius;

  return (
    <g
      className={`bead bead--type-span${isEmpty ? ' bead--empty' : ''}`}
      onMouseEnter={() => onMouseEnter(id)}
      onMouseDown={() => onMouseDown(id)}
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

KrestikBeadView.displayName = 'KrestikBeadView';
