import { useCallback } from 'react';
import { Bead } from '../../../types/bead';
import { PendantChain } from '../../../types/pendant';
import { computeChainBeadPositions, chainBeadId } from '../../../utils/pendantChain';
import { BEAD_THEME, defaultColorFor } from '../../../config/theme';
import './PendantChainLayer.css';

interface PendantChainLayerProps {
  chains: PendantChain[];
  bottomNodes: Bead[];
  isDrawing: boolean;
  onPaintBead: (placementId: string, beadIndex: number) => void;
  onRemove: (placementId: string) => void;
  highlightedColor?: string | null;
  // См. PendantLayer.tsx — магнит нитки работает и по бисеринам цепочки-подвески.
  threadToolActive: boolean;
  onThreadPoint: (id: string) => void;
}

const ID_SEP = '::';

export const PendantChainLayer = ({
  chains,
  bottomNodes,
  isDrawing,
  onPaintBead,
  onRemove,
  highlightedColor,
  threadToolActive,
  onThreadPoint,
}: PendantChainLayerProps) => {
  const nodeByCol = new Map<number, Bead>();
  bottomNodes.forEach((n) => nodeByCol.set(n.logicalIndex.col, n));

  const handlePointerDown = useCallback((id: string) => {
    const [placementId, idx] = id.split(ID_SEP);
    if (threadToolActive) {
      onThreadPoint(chainBeadId(placementId, Number(idx)));
      return;
    }
    onPaintBead(placementId, Number(idx));
  }, [onPaintBead, threadToolActive, onThreadPoint]);

  // Нитка добавляет точки только явным кликом (handlePointerDown) — протяжка
  // сюда не заходит, поэтому threadToolActive тут не проверяется вовсе.
  const handlePointerEnter = useCallback((id: string) => {
    if (threadToolActive || !isDrawing) return;
    const [placementId, idx] = id.split(ID_SEP);
    onPaintBead(placementId, Number(idx));
  }, [isDrawing, onPaintBead, threadToolActive]);

  const { spanRadius } = BEAD_THEME.sizes;

  return (
    <g className="pendant-chain-layer">
      {chains.map((chain) => {
        const start = nodeByCol.get(chain.startCol);
        const end = nodeByCol.get(chain.endCol);
        if (!start || !end) return null;
        const positions = computeChainBeadPositions(start, end);

        // Самая нижняя (провисшая) бисерина — под ней рисуем кнопку удаления;
        // если бисерин нет (вырожденный случай), fallback на середину хорды.
        const apex = positions.reduce(
          (best, p) => (p.y > best.y ? p : best),
          positions[0] ?? { x: (start.x + end.x) / 2, y: Math.max(start.y, end.y) },
        );
        const maxY = Math.max(start.y, end.y, apex.y);
        const removeBtnY = maxY + 14;

        return (
          <g
            key={chain.placementId}
            className="pendant-chain-group"
            onMouseDownCapture={(e) => {
              if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                onRemove(chain.placementId);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {positions.map((pos, index) => {
              const id = `${chain.placementId}${ID_SEP}${index}`;
              const hasColor = chain.colorMap[index] !== undefined;
              const color = chain.colorMap[index] ?? defaultColorFor('SPAN');
              const groupClassName = `pendant-chain-bead bead bead--type-span${!hasColor ? ' bead--empty' : ''}`;
              const bodyStyle = { '--bead-color': color } as React.CSSProperties;
              const isHighlighted = highlightedColor === color;

              return (
                <g
                  key={index}
                  className={groupClassName}
                  onPointerEnter={() => handlePointerEnter(id)}
                  onPointerDown={(e) => {
                    // См. BeadView.tsx: снимаем implicit pointer capture с
                    // e.target, а не e.currentTarget (<g> не держит capture) —
                    // иначе рисование по цепочке пальцем ломается.
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
                    className="pendant-chain-bead__hitbox"
                    cx={pos.x}
                    cy={pos.y}
                    r={spanRadius + 4}
                  />
                  <circle
                    className="pendant-chain-bead__body bead__body"
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
              className="pendant-chain-remove-btn"
              transform={`translate(${apex.x}, ${removeBtnY})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove(chain.placementId);
              }}
            >
              <circle className="pendant-chain-remove-btn__bg" r={8} />
              <path
                className="pendant-chain-remove-btn__icon"
                d="M -3 -3 L 3 3 M -3 3 L 3 -3"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
};
