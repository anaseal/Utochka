import { memo, useCallback } from 'react';
import { Bead } from '../../../types/bead';
import {
  PendantAnchor, PendantPlacement, PendantTemplate, PendantTemplateBead, ToothPlacement,
} from '../../../types/pendant';
import { PENDANT_SCALE } from '../../../data/pendantTemplates';
import { BEAD_THEME, beadStateClass, defaultColorFor, effectiveBeadColor } from '../../../config/theme';
import { pendantBeadId } from '../../../utils/floodFill';
import { ToothMesh } from '../../../utils/tooth';
import { resolvePendantAnchor, pendantAnchorsEqual, mirrorPendantAnchor } from '../../../utils/pendantAnchor';
import './PendantLayer.css';

interface PendantLayerProps {
  placements: PendantPlacement[];
  templates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  // Геометрия меша каждого зубца — резолв якоря {kind:'tooth'} в координаты
  // конкретного узла-границы, см. resolvePendantAnchor.
  toothMeshes: Map<string, ToothMesh>;
  teeth: ToothPlacement[];
  isDrawing: boolean;
  onPaintBead: (placementId: string, beadIndex: number) => void;
  onRemove: (placementId: string) => void;
  hoveredAnchor: PendantAnchor | null;
  mirrorMode: boolean;
  width: number;
  highlightedColor?: string | null;
  // Инструмент «нитка» магнитится к любой бусине на холсте, включая подвески
  // (см. spec.md, «Нитка») — пока он активен, наведение/клик по бусине
  // подвески трассирует нитку вместо покраски.
  threadToolActive: boolean;
  onThreadPoint: (id: string) => void;
}

const ID_SEP = '::';

const beadBottom = (bead: PendantTemplateBead): number => {
  const half = bead.shape === 'circle' ? (bead.r ?? 0) : (bead.h ?? 0) / 2;
  return bead.dy + half;
};

// memo: без него слой пересобирал бы JSX всех подвесок на каждый рендер
// CanvasView (в т.ч. на каждую покрашенную бисерину основной сетки), хотя
// сами подвески в это время не меняются.
export const PendantLayer = memo(({
  placements,
  templates,
  bottomNodes,
  toothMeshes,
  teeth,
  isDrawing,
  onPaintBead,
  onRemove,
  hoveredAnchor,
  mirrorMode,
  width,
  highlightedColor,
  threadToolActive,
  onThreadPoint,
}: PendantLayerProps) => {
  const pendantAnchorByCol = new Map<number, Bead>();
  bottomNodes.forEach((n) => pendantAnchorByCol.set(n.logicalIndex.col, n));

  // Занятыми считаем только якоря с реально отрисованной подвеской (шаблон
  // существует + якорь резолвится), иначе индикатор краснеет на пустом месте.
  const occupiedAnchors = placements
    .filter((p) => templates[p.templateId] && resolvePendantAnchor(p.anchor, pendantAnchorByCol, toothMeshes))
    .map((p) => p.anchor);

  const handlePointerDown = useCallback((id: string) => {
    const [placementId, idx] = id.split(ID_SEP);
    if (threadToolActive) {
      onThreadPoint(pendantBeadId(placementId, Number(idx)));
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

  return (
    <g className="pendant-layer">
      {hoveredAnchor !== null && (() => {
        // В зеркальном режиме подсвечиваем и симметричный якорь — туда
        // подвеска добавится автоматически (см. mirrorPendantAnchor).
        const targets = [hoveredAnchor];
        if (mirrorMode && width > 1) {
          const mirror = mirrorPendantAnchor(hoveredAnchor, teeth, width);
          if (mirror && !pendantAnchorsEqual(mirror, hoveredAnchor)) targets.push(mirror);
        }
        return targets.map((target) => {
          const anchor = resolvePendantAnchor(target, pendantAnchorByCol, toothMeshes);
          if (!anchor) return null;
          const occupied = occupiedAnchors.some((a) => pendantAnchorsEqual(a, target));
          return (
            <circle
              key={anchor.id}
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
        const anchor = resolvePendantAnchor(placement.anchor, pendantAnchorByCol, toothMeshes);
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
              const color = effectiveBeadColor(placement.colorMap[index], defaultColorFor(bead.type));
              const beadTypeClass = bead.type === 'NODE' ? 'bead--type-node' : 'bead--type-span';
              const groupClassName =
                `pendant-bead bead ${beadTypeClass}${beadStateClass(placement.colorMap[index])}`;
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
                    // См. BeadView.tsx: снимаем implicit pointer capture с
                    // e.target (реально захваченный элемент), а не
                    // e.currentTarget (<g>) — иначе release молча не
                    // срабатывает и рисование по подвеске пальцем ломается.
                    if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
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
});

PendantLayer.displayName = 'PendantLayer';
