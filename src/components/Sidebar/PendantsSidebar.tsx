import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bead } from '../../types/bead';
import { PendantPlacement, PendantTemplate } from '../../types/pendant';
import { BEAD_THEME, defaultColorFor } from '../../config/theme';
import './PendantsSidebar.css';

interface PendantsSidebarProps {
  open: boolean;
  templates: PendantTemplate[];
  placements: PendantPlacement[];
  onHoveredColChange: (col: number | null) => void;
  onAddPlacement: (templateId: string, col: number) => void;
  onClearAll: () => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  bottomNodes: Bead[];
  zoom: number;
}

const ANCHOR_R = 18;

const PendantPreview = ({ template }: { template: PendantTemplate }) => {
  let minX = -ANCHOR_R;
  let maxX = ANCHOR_R;
  let minY = -ANCHOR_R;
  let maxY = ANCHOR_R;

  for (const bead of template.beads) {
    const hx = bead.shape === 'circle' ? (bead.r ?? 0) : (bead.w ?? 0) / 2;
    const hy = bead.shape === 'circle' ? (bead.r ?? 0) : (bead.h ?? 0) / 2;
    minX = Math.min(minX, bead.dx - hx);
    maxX = Math.max(maxX, bead.dx + hx);
    minY = Math.min(minY, bead.dy - hy);
    maxY = Math.max(maxY, bead.dy + hy);
  }

  const pad = 8;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="pendant-preview"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle className="pendant-preview__anchor" cx={0} cy={0} r={ANCHOR_R} />
      {template.beads.map((bead, index) => bead.shape === 'circle' ? (
        <circle
          key={index}
          cx={bead.dx}
          cy={bead.dy}
          r={bead.r ?? 0}
          fill={defaultColorFor(bead.type)}
          stroke="#0f172a"
          strokeWidth={1}
        />
      ) : (
        <rect
          key={index}
          x={bead.dx - (bead.w ?? 0) / 2}
          y={bead.dy - (bead.h ?? 0) / 2}
          width={bead.w ?? 0}
          height={bead.h ?? 0}
          rx={4}
          fill={defaultColorFor(bead.type)}
          stroke="#0f172a"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
};

export const PendantsSidebar = ({
  open,
  templates,
  placements,
  onHoveredColChange,
  onAddPlacement,
  onClearAll,
  canvasSvgRef,
  bottomNodes,
  zoom,
}: PendantsSidebarProps) => {
  const [drag, setDrag] = useState<{ templateId: string; x: number; y: number } | null>(null);

  const computeCol = useCallback((clientX: number, clientY: number): number | null => {
    const svg = canvasSvgRef.current;
    if (!svg || bottomNodes.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
    const px = (clientX - rect.left) / zoom - offsetX;
    const py = (clientY - rect.top) / zoom - offsetY;

    const bottomY = bottomNodes[0].y;
    if (py < bottomY - BEAD_THEME.gridDefaults.spacing) return null;

    const stepX = bottomNodes.length > 1
      ? Math.abs(bottomNodes[1].x - bottomNodes[0].x)
      : BEAD_THEME.gridDefaults.spacing * BEAD_THEME.gridDefaults.horizontalStepMultiplier;

    let best: number | null = null;
    let bestDist = Infinity;
    for (const n of bottomNodes) {
      const d = Math.abs(px - n.x);
      if (d < bestDist) { bestDist = d; best = n.logicalIndex.col; }
    }
    if (bestDist > stepX / 2) return null;
    return best;
  }, [canvasSvgRef, bottomNodes, zoom]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      onHoveredColChange(computeCol(e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      const col = computeCol(e.clientX, e.clientY);
      if (col !== null) onAddPlacement(drag.templateId, col);
      onHoveredColChange(null);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, computeCol, onHoveredColChange, onAddPlacement]);

  const dragTemplate = drag
    ? templates.find((t) => t.id === drag.templateId) ?? null
    : null;

  return (
    <>
      <aside className={`pendants-sidebar${open ? ' pendants-sidebar--open' : ''}`}>
        <header className="pendants-sidebar__header">Pendants</header>
        <div className="pendants-sidebar__catalog">
          {templates.map((template) => {
            const placedCount = placements.filter((p) => p.templateId === template.id).length;
            return (
              <button
                key={template.id}
                type="button"
                className="pendant-card"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDrag({ templateId: template.id, x: e.clientX, y: e.clientY });
                }}
              >
                <div className="pendant-card__preview">
                  <PendantPreview template={template} />
                </div>
                <span className="pendant-card__name">{template.name}</span>
                {placedCount > 0 && (
                  <span className="pendant-card__badge">{placedCount}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="pendants-sidebar__footer">
          <button
            type="button"
            className="pendants-sidebar__clear"
            onClick={onClearAll}
            disabled={placements.length === 0}
          >
            Reset all
          </button>
          <p className="pendants-sidebar__hint">
            Drag a pendant onto a bottom-row node
          </p>
        </div>
      </aside>

      {drag && dragTemplate && createPortal(
        <div
          className="pendant-drag-ghost"
          style={{ left: drag.x, top: drag.y }}
        >
          <PendantPreview template={dragTemplate} />
        </div>,
        document.body,
      )}
    </>
  );
};
