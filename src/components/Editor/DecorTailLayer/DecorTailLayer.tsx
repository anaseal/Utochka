import { memo, useCallback } from 'react';
import { Bead } from '../../../types/bead';
import { DecorTailPlacement } from '../../../types/pendant';
import { BEAD_THEME, beadStateClass, defaultColorFor, effectiveBeadColor } from '../../../config/theme';
import { computeDecorTailBeadPositions, decorTailBeadId, parseDecorTailBeadId } from '../../../utils/decorTail';
import './DecorTailLayer.css';

interface DecorTailLayerProps {
  placements: DecorTailPlacement[];
  // Настоящие ноды нижнего ряда — хвост всегда крепится к ноде, а не к
  // другому декору (в отличие от PendantLayer, который получает якорь с
  // подменой на кончик хвоста — см. pendantAnchors в useSilyankaProject.ts).
  bottomNodes: Bead[];
  decorRowStep: number;
  isDrawing: boolean;
  onPaintBead: (placementId: string, beadIndex: number) => void;
  onRemove: (placementId: string) => void;
  hoveredCol: number | null;
  mirrorMode: boolean;
  width: number;
  highlightedColor?: string | null;
  // См. PendantLayer.tsx — магнит нитки работает и по бисеринам хвоста.
  threadToolActive: boolean;
  onThreadPoint: (id: string) => void;
}

// memo: см. PendantLayer.tsx — тот же смысл, хвосты не должны пересобираться
// на каждую покрашенную бисерину основной сетки.
export const DecorTailLayer = memo(({
  placements,
  bottomNodes,
  decorRowStep,
  isDrawing,
  onPaintBead,
  onRemove,
  hoveredCol,
  mirrorMode,
  width,
  highlightedColor,
  threadToolActive,
  onThreadPoint,
}: DecorTailLayerProps) => {
  const { spanRadius } = BEAD_THEME.sizes;
  const nodeByCol = new Map<number, Bead>();
  bottomNodes.forEach((n) => nodeByCol.set(n.logicalIndex.col, n));

  const occupiedCols = new Set(
    placements.filter((t) => nodeByCol.has(t.col)).map((t) => t.col),
  );

  const handlePointerDown = useCallback((id: string) => {
    const [placementId, idx] = parseDecorTailBeadId(id);
    if (threadToolActive) {
      onThreadPoint(id);
      return;
    }
    onPaintBead(placementId, idx);
  }, [onPaintBead, threadToolActive, onThreadPoint]);

  const handlePointerEnter = useCallback((id: string) => {
    if (threadToolActive || !isDrawing) return;
    const [placementId, idx] = parseDecorTailBeadId(id);
    onPaintBead(placementId, idx);
  }, [isDrawing, onPaintBead, threadToolActive]);

  return (
    <g className="decor-tail-layer">
      {hoveredCol !== null && (() => {
        // В зеркальном режиме подсвечиваем и симметричную колонку — туда
        // хвост добавится/уберётся автоматически (нижний ряд чётный:
        // зеркало width-1-c), как и у подвесок.
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
              className={`decor-tail-drop-target${occupied ? ' decor-tail-drop-target--replace' : ''}`}
              cx={anchor.x}
              cy={anchor.y}
              r={BEAD_THEME.sizes.nodeRadius * 2.4}
              pointerEvents="none"
            />
          );
        });
      })()}

      {placements.map((tail) => {
        const anchor = nodeByCol.get(tail.col);
        if (!anchor) return null;

        const positions = computeDecorTailBeadPositions(anchor, tail.rows, decorRowStep);
        const maxBottom = tail.rows * decorRowStep;
        const removeBtnY = maxBottom + 14;
        const hitR = spanRadius + 4;

        return (
          <g
            key={tail.placementId}
            className="decor-tail-group"
            onMouseDownCapture={(e) => {
              if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                onRemove(tail.placementId);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <rect
              className="decor-tail-hover-area"
              x={anchor.x - hitR - 2}
              y={anchor.y + BEAD_THEME.sizes.nodeRadius}
              width={(hitR + 2) * 2}
              height={removeBtnY + 12 - BEAD_THEME.sizes.nodeRadius}
            />

            {positions.map((pos, index) => {
              const id = decorTailBeadId(tail.placementId, index);
              const color = effectiveBeadColor(tail.colorMap[index], defaultColorFor('SPAN'));
              const groupClassName =
                `decor-tail-bead bead bead--type-span${beadStateClass(tail.colorMap[index])}`;
              const bodyStyle = { '--bead-color': color } as React.CSSProperties;
              const isHighlighted = highlightedColor === color;

              return (
                <g
                  key={index}
                  className={groupClassName}
                  onPointerEnter={() => handlePointerEnter(id)}
                  onPointerDown={(e) => {
                    // См. BeadView.tsx: снимаем implicit pointer capture с
                    // e.target, а не e.currentTarget — иначе release молча
                    // не срабатывает и рисование по хвосту пальцем ломается.
                    if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
                    handlePointerDown(id);
                  }}
                >
                  {isHighlighted && (
                    <circle
                      className="bead__highlight"
                      cx={pos.x}
                      cy={pos.y}
                      r={spanRadius + 3.5}
                      pointerEvents="none"
                    />
                  )}
                  <circle
                    className="decor-tail-bead__hitbox"
                    cx={pos.x}
                    cy={pos.y}
                    r={hitR}
                  />
                  <circle
                    className="decor-tail-bead__body bead__body"
                    cx={pos.x}
                    cy={pos.y}
                    r={spanRadius}
                    fill={color}
                    style={bodyStyle}
                  />
                </g>
              );
            })}

            <g
              className="decor-tail-remove-btn"
              transform={`translate(${anchor.x}, ${anchor.y + removeBtnY})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove(tail.placementId);
              }}
            >
              <circle className="decor-tail-remove-btn__bg" r={8} />
              <path
                className="decor-tail-remove-btn__icon"
                d="M -3 -3 L 3 3 M -3 3 L 3 -3"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
});

DecorTailLayer.displayName = 'DecorTailLayer';
