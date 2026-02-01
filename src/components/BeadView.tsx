import { Bead } from '../types/bead';

interface BeadViewProps {
  bead: Bead;
  onMouseDown: () => void;
  onMouseEnter: () => void;
}

export const BeadView = ({ bead, onMouseDown, onMouseEnter }: BeadViewProps) => {
  const isNode = bead.type === 'NODE';
  // Цвета по умолчанию из вашего ТЗ
  const defaultColor = isNode ? '#22d3ee' : '#e879f9';
  const finalColor = bead.color || defaultColor;

  return (
    <g 
      className="bead-group"
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
    >
      <circle
        cx={bead.x}
        cy={bead.y}
        r={11} // Удобный хитбокс
        fill="transparent"
        style={{ cursor: 'crosshair' }}
      />
      <circle
        cx={bead.x}
        cy={bead.y}
        r={isNode ? 7 : 6} // Строго по ТЗ
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