import { memo, useCallback } from 'react';
import { ToothPlacement } from '../../../types/pendant';
import { ToothMesh, toothBeadId } from '../../../utils/tooth';
import { BEAD_THEME, beadStateClass, defaultColorFor } from '../../../config/theme';
import './ToothLayer.css';

interface ToothLayerProps {
  teeth: ToothPlacement[];
  toothMeshes: Map<string, ToothMesh>;
  isDrawing: boolean;
  onPaintBead: (placementId: string, beadIndex: number) => void;
  onRemove: (placementId: string) => void;
  highlightedColor?: string | null;
  // См. PendantChainLayer.tsx — магнит нитки работает и по бисеринам зубца.
  threadToolActive: boolean;
  onThreadPoint: (id: string) => void;
  // Инструмент 'pendant-chain' может цепляться и за узлы-границы меша зубца
  // (см. ChainEndpoint в types/pendant.ts) — только бисерины с непустым
  // bead.side, клик по внутренней бисерине широкого зубца молча игнорируется.
  chainToolActive: boolean;
  onChainNodeClick: (placementId: string, beadIndex: number) => void;
  // id незавершённого выбора цепочки (см. chainPendingId в CanvasView.tsx) —
  // подсвечивает бисерину зубца тем же кольцом, что и highlightedColor, если
  // она сейчас отмечена как начало цепочки.
  chainPendingBeadId?: string | null;
}

const ID_SEP = '::';

// memo: см. PendantChainLayer.tsx — тот же смысл, зубцы не должны
// пересобираться на каждую покрашенную бисерину основной сетки.
export const ToothLayer = memo(({
  teeth,
  toothMeshes,
  isDrawing,
  onPaintBead,
  onRemove,
  highlightedColor,
  threadToolActive,
  onThreadPoint,
  chainToolActive,
  onChainNodeClick,
  chainPendingBeadId,
}: ToothLayerProps) => {
  const handlePointerDown = useCallback((id: string, side?: ('left' | 'right')[]) => {
    const [placementId, idx] = id.split(ID_SEP);
    if (threadToolActive) {
      onThreadPoint(toothBeadId(placementId, Number(idx)));
      return;
    }
    if (chainToolActive) {
      // Только границы меша (side непустой) — внутренние бисерины широких
      // зубцов не годятся в конец цепочки (см. spec.md, «Цепочки-подвески»).
      if (side && side.length > 0) onChainNodeClick(placementId, Number(idx));
      return;
    }
    onPaintBead(placementId, Number(idx));
  }, [onPaintBead, threadToolActive, onThreadPoint, chainToolActive, onChainNodeClick]);

  const handlePointerEnter = useCallback((id: string) => {
    if (threadToolActive || chainToolActive || !isDrawing) return;
    const [placementId, idx] = id.split(ID_SEP);
    onPaintBead(placementId, Number(idx));
  }, [isDrawing, onPaintBead, threadToolActive, chainToolActive]);

  const { nodeRadius, spanRadius } = BEAD_THEME.sizes;

  return (
    <g className="tooth-layer">
      {teeth.map((tooth) => {
        const mesh = toothMeshes.get(tooth.placementId);
        if (!mesh || mesh.beads.length === 0) return null;
        const tip = mesh.beads[mesh.tipIndex];

        return (
          <g
            key={tooth.placementId}
            className="tooth-group"
            onMouseDownCapture={(e) => {
              if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                onRemove(tooth.placementId);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {mesh.beads.map((bead, index) => {
              const id = `${tooth.placementId}${ID_SEP}${index}`;
              const color = tooth.colorMap[index] ?? defaultColorFor(bead.kind === 'node' ? 'NODE' : 'SPAN');
              const groupClassName =
                `tooth-bead bead bead--type-${bead.kind}${beadStateClass(tooth.colorMap[index])}`;
              const bodyStyle = { '--bead-color': color } as React.CSSProperties;
              const canonicalId = toothBeadId(tooth.placementId, index);
              const isHighlighted = highlightedColor === color || canonicalId === chainPendingBeadId;
              const radius = bead.kind === 'node' ? nodeRadius : spanRadius;

              return (
                <g
                  key={index}
                  className={groupClassName}
                  onPointerEnter={() => handlePointerEnter(id)}
                  onPointerDown={(e) => {
                    // См. BeadView.tsx: снимаем implicit pointer capture с
                    // e.target, а не e.currentTarget (<g> не держит capture) —
                    // иначе рисование по зубцу пальцем ломается.
                    if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
                    handlePointerDown(id, bead.side);
                  }}
                >
                  {isHighlighted && (
                    <circle
                      className="bead__highlight"
                      cx={bead.x}
                      cy={bead.y}
                      r={radius + 3.5}
                      pointerEvents="none"
                    />
                  )}
                  <circle
                    className="tooth-bead__hitbox"
                    cx={bead.x}
                    cy={bead.y}
                    r={radius + 4}
                  />
                  <circle
                    className="tooth-bead__body bead__body"
                    cx={bead.x}
                    cy={bead.y}
                    r={radius}
                    fill={color}
                    style={bodyStyle}
                  />
                </g>
              );
            })}

            <g
              className="tooth-remove-btn"
              transform={`translate(${tip.x}, ${tip.y + 14})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove(tooth.placementId);
              }}
            >
              <circle className="tooth-remove-btn__bg" r={8} />
              <path
                className="tooth-remove-btn__icon"
                d="M -3 -3 L 3 3 M -3 3 L 3 -3"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
});

ToothLayer.displayName = 'ToothLayer';
