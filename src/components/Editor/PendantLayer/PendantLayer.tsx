import { useCallback } from 'react';
import { Bead } from '../../../types/bead';
import { PendantPlacement, PendantTemplate, PendantTemplateBead } from '../../../types/pendant';
import { PENDANT_SCALE } from '../../../data/pendantTemplates';
import { BEAD_THEME, defaultColorFor } from '../../../config/theme';
import './PendantLayer.css';

interface PendantLayerProps {
  placements: PendantPlacement[];
  templates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  isDrawing: boolean;
  onPaintBead: (placementId: string, beadIndex: number) => void;
  onRemove: (placementId: string) => void;
  hoveredCol: number | null;
  mirrorMode: boolean;
  width: number;
  highlightedColor?: string | null;
}

const ID_SEP = '::';

const beadBottom = (bead: PendantTemplateBead): number => {
  const half = bead.shape === 'circle' ? (bead.r ?? 0) : (bead.h ?? 0) / 2;
  return bead.dy + half;
};

export const PendantLayer = ({
  placements,
  templates,
  bottomNodes,
  isDrawing,
  onPaintBead,
  onRemove,
  hoveredCol,
  mirrorMode,
  width,
  highlightedColor,
}: PendantLayerProps) => {
  const nodeByCol = new Map<number, Bead>();
  bottomNodes.forEach((n) => nodeByCol.set(n.logicalIndex.col, n));

  // Занятыми считаем только ноды с реально отрисованной подвеской (шаблон
  // существует + нода существует), иначе индикатор краснеет на пустой ноде.
  const occupiedCols = new Set(
    placements
      .filter((p) => templates[p.templateId] && nodeByCol.has(p.col))
      .map((p) => p.col),
  );

  const handlePointerDown = useCallback((id: string) => {
    const [placementId, idx] = id.split(ID_SEP);
    onPaintBead(placementId, Number(idx));
  }, [onPaintBead]);

  const handlePointerEnter = useCallback((id: string) => {
    if (!isDrawing) return;
    const [placementId, idx] = id.split(ID_SEP);
    onPaintBead(placementId, Number(idx));
  }, [isDrawing, onPaintBead]);

  return (
    <g className="pendant-layer">
      {hoveredCol !== null && (() => {
        // В зеркальном режиме подсвечиваем и симметричную колонку — туда
        // подвеска добавится автоматически (нижний ряд чётный: зеркало width-1-c).
        const cols = mirrorMode && width > 1
          ? [...new Set([hoveredCol, width - 1 - hoveredCol])]
          : [hoveredCol];
        return cols.map((col) => {
          const anchor = nodeByCol.get(col);
          if (!anchor) return null;
          const occupied = occupiedCols.has(col);
          return (
            <circle
              key={col}
              className={`pendant-drop-target${occupied ? ' pendant-drop-target--replace' : ''}`}
              cx={anchor.x}
              cy={anchor.y}
              r={BEAD_THEME.sizes.nodeRadius * 2.4}
              pointerEvents="none"
            />
          );
        });
      })()}

      {placements.map((placement) => {
        const template = templates[placement.templateId];
        const anchor = nodeByCol.get(placement.col);
        if (!template || !anchor) return null;

        const maxBottom = Math.max(...template.beads.map(beadBottom)) * PENDANT_SCALE;
        const removeBtnY = maxBottom + 14;

        // Прозрачная зона: удерживает :hover группы, пока курсор движется
        // от бусин к кнопке удаления (иначе кнопка пропадает на разрыве).
        let relMinX = -12;
        let relMaxX = 12;
        for (const bead of template.beads) {
          const half = (bead.shape === 'circle' ? (bead.r ?? 0) : (bead.w ?? 0) / 2) * PENDANT_SCALE;
          relMinX = Math.min(relMinX, bead.dx * PENDANT_SCALE - half);
          relMaxX = Math.max(relMaxX, bead.dx * PENDANT_SCALE + half);
        }
        const hoverTop = BEAD_THEME.sizes.nodeRadius;
        const hoverBottom = removeBtnY + 12;

        return (
          <g
            key={placement.placementId}
            className="pendant-group"
            onMouseDownCapture={(e) => {
              if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                onRemove(placement.placementId);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <rect
              className="pendant-hover-area"
              x={anchor.x + relMinX - 2}
              y={anchor.y + hoverTop}
              width={relMaxX - relMinX + 4}
              height={hoverBottom - hoverTop}
            />

            {template.beads.map((bead, index) => {
              const id = `${placement.placementId}${ID_SEP}${index}`;
              const cx = anchor.x + bead.dx * PENDANT_SCALE;
              const cy = anchor.y + bead.dy * PENDANT_SCALE;
              const hasColor = placement.colorMap[index] !== undefined;
              const color = placement.colorMap[index] ?? defaultColorFor(bead.type);
              const beadTypeClass = bead.type === 'NODE' ? 'bead--type-node' : 'bead--type-span';
              const groupClassName = `pendant-bead bead ${beadTypeClass}${!hasColor ? ' bead--empty' : ''}`;
              const bodyStyle = { '--bead-color': color } as React.CSSProperties;
              const isHighlighted = highlightedColor === color;
              // Радиус подсветки — как для тела бисерины (circle: r, rect: половина
              // большей стороны), + тот же отступ 3.5, что у BeadView.
              const highlightRadius = (bead.shape === 'circle'
                ? (bead.r ?? 0)
                : Math.max(bead.w ?? 0, bead.h ?? 0) / 2) * PENDANT_SCALE + 3.5;

              return (
                <g
                  key={index}
                  className={groupClassName}
                  onPointerEnter={() => handlePointerEnter(id)}
                  onPointerDown={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    handlePointerDown(id);
                  }}
                >
                  {isHighlighted && (
                    <circle
                      className="bead__highlight"
                      cx={cx}
                      cy={cy}
                      r={highlightRadius}
                      pointerEvents="none"
                    />
                  )}
                  {bead.shape === 'circle' ? (
                    <>
                      <circle
                        className="pendant-bead__hitbox"
                        cx={cx}
                        cy={cy}
                        r={(bead.r ?? 0) * PENDANT_SCALE + 4}
                      />
                      <circle
                        className="pendant-bead__body bead__body"
                        cx={cx}
                        cy={cy}
                        r={(bead.r ?? 0) * PENDANT_SCALE}
                        fill={color}
                        style={bodyStyle}
                      />
                    </>
                  ) : (
                    <>
                      <rect
                        className="pendant-bead__hitbox"
                        x={cx - ((bead.w ?? 0) * PENDANT_SCALE) / 2 - 3}
                        y={cy - ((bead.h ?? 0) * PENDANT_SCALE) / 2 - 3}
                        width={(bead.w ?? 0) * PENDANT_SCALE + 6}
                        height={(bead.h ?? 0) * PENDANT_SCALE + 6}
                      />
                      <rect
                        className="pendant-bead__body bead__body"
                        x={cx - ((bead.w ?? 0) * PENDANT_SCALE) / 2}
                        y={cy - ((bead.h ?? 0) * PENDANT_SCALE) / 2}
                        width={(bead.w ?? 0) * PENDANT_SCALE}
                        height={(bead.h ?? 0) * PENDANT_SCALE}
                        rx={2}
                        fill={color}
                        style={bodyStyle}
                      />
                    </>
                  )}
                </g>
              );
            })}

            <g
              className="pendant-remove-btn"
              transform={`translate(${anchor.x}, ${anchor.y + removeBtnY})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove(placement.placementId);
              }}
            >
              <circle className="pendant-remove-btn__bg" r={8} />
              <path
                className="pendant-remove-btn__icon"
                d="M -3 -3 L 3 3 M -3 3 L 3 -3"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
};
