import { Bead } from '../types/bead';
import { BEAD_THEME } from '../config/theme';

interface BeadViewProps {
  bead: Bead;
  onClick?: (id: string) => void;
  onMouseEnter?: () => void;
}

export const BeadView = ({ bead, onClick, onMouseEnter }: BeadViewProps) => {
  const isNode = bead.type === 'NODE';
  
  return (
    <g 
      className="cursor-crosshair"
      onMouseEnter={onMouseEnter}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(bead.id);
      }}
    >
      {/* 1. НЕВИДИМЫЙ ХИТБОКС (увеличивает зону клика) */}
      <circle
        cx={bead.x}
        cy={bead.y}
        r={BEAD_THEME.sizes.nodeRadius * 2.5} // Увеличили зону попадания в 2.5 раза
        fill="transparent"
        className="pointer-events-auto"
      />

      {/* 2. РЕАЛЬНАЯ БИСЕРИНКА */}
      <circle
        cx={bead.x}
        cy={bead.y}
        r={isNode ? BEAD_THEME.sizes.nodeRadius : BEAD_THEME.sizes.spanRadius}
        fill={bead.color || (isNode ? BEAD_THEME.colors.node : BEAD_THEME.colors.span)}
        style={{ 
          filter: isNode ? BEAD_THEME.effects.nodeShadow : 'none',
          transition: 'fill 0.1s ease-in-out',
          pointerEvents: 'none' // Пропускает события сквозь себя на хитбокс
        }}
        className="hover:stroke-white hover:stroke-[1px]"
      />
    </g>
  );
};