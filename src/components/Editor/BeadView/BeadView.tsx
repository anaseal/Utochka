import { Bead } from '../../../types/bead';
import './BeadView.css';

interface BeadViewProps {
  bead: Bead;
  onMouseDown: () => void;
  onMouseEnter: () => void;
}

export const BeadView = ({ bead, onMouseDown, onMouseEnter }: BeadViewProps) => {
  const isNode = bead.type === 'NODE';
  const defaultColor = isNode ? '#bcd4e6' : '#d6e2e9';
  const finalColor = bead.color || defaultColor;

  return (
    <g 
      className={`bead ${isNode ? 'bead--type-node' : 'bead--type-span'}`}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
    >
      <circle
        className="bead__hitbox"
        cx={bead.x}
        cy={bead.y}
        r={11}
      />
      <circle
        className="bead__body"
        cx={bead.x}
        cy={bead.y}
        r={isNode ? 7 : 6}
        fill={finalColor}
        style={{ '--bead-color': finalColor } as React.CSSProperties}
      />
    </g>
  );
};