import { Bead } from '../types/bead';

interface BeadViewProps {
  bead: Bead;
  onMouseDown: () => void;
  onMouseEnter: () => void;
}

export const BeadView = ({ bead, onMouseDown, onMouseEnter }: BeadViewProps) => {
  const isNode = bead.type === 'NODE';
  const defaultColor = isNode ? '#22d3ee' : '#e879f9';
  const finalColor = bead.color || defaultColor;

  return (
    <g 
      className="bead-group"
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
    >
      {/* Увеличенный хитбокс. r=10 для Node(7) и Span(6) */}
      <circle
        cx={bead.x}
        cy={bead.y}
        r={10} 
        fill="transparent"
        className="cursor-crosshair pointer-events-auto"
      />

      {/* Сама бисеринка */}
      <circle
        cx={bead.x}
        cy={bead.y}
        r={isNode ? 7 : 6}
        fill={finalColor}
        className={`bead-base ${isNode ? 'bead-glow' : ''}`}
        style={{ 
          '--bead-color': finalColor,
          shapeRendering: 'geometricPrecision',
          pointerEvents: 'none' 
        } as React.CSSProperties}
      />
    </g>
  );
};