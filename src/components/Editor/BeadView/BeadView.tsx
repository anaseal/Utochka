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
  onMouseDown: (id: string) => void;
  onMouseEnter: (id: string) => void;
}

export const BeadView = memo(({ 
  id, 
  x, 
  y, 
  type, 
  color, 
  defaultColor,
  onMouseDown, 
  onMouseEnter 
}: BeadViewProps) => {
  const isNode = type === 'NODE';
  const finalColor = color || defaultColor;

  // Извлекаем размеры из конфига
  const { nodeRadius, spanRadius, hitboxRadius } = BEAD_THEME.sizes;

  return (
    <g 
      className={`bead ${isNode ? 'bead--type-node' : 'bead--type-span'}`}
      onMouseEnter={() => onMouseEnter(id)}
      onMouseDown={() => onMouseDown(id)}
    >
      <circle
        className="bead__hitbox"
        cx={x}
        cy={y}
        r={hitboxRadius} // Теперь берется из BEAD_THEME
      />
      <circle
        className="bead__body"
        cx={x}
        cy={y}
        r={isNode ? nodeRadius : spanRadius} // Теперь берется из BEAD_THEME
        fill={finalColor}
        style={{ '--bead-color': finalColor } as React.CSSProperties}
      />
    </g>
  );
});

BeadView.displayName = 'BeadView';