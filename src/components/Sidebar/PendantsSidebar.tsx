import { useCallback, useEffect, useMemo, useState } from 'react';
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
  decorBands: Record<number, number>;
  rowGaps: { row: number; midY: number }[];
  onDecorDrop: (nodeRow: number) => void;
  onDecorCount: (nodeRow: number, delta: number) => void;
  onClearDecor: () => void;
  onHoveredRowChange: (row: number | null) => void;
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

const BAND_YS = [-24, -12, 0, 12, 24] as const;

const BandPreview = () => (
  <svg
    viewBox="-12 -32 24 64"
    className="pendant-preview"
    preserveAspectRatio="xMidYMid meet"
  >
    {BAND_YS.map((y) => (
      <circle
        key={y}
        cx={0}
        cy={y}
        r={6}
        fill={defaultColorFor('SPAN')}
        stroke="#0f172a"
        strokeWidth={1}
      />
    ))}
  </svg>
);

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
  decorBands,
  rowGaps,
  onDecorDrop,
  onDecorCount,
  onClearDecor,
  onHoveredRowChange,
}: PendantsSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'pendants' | 'decor'>('pendants');
  const [drag, setDrag] = useState<{ templateId: string; x: number; y: number } | null>(null);
  const [decorDrag, setDecorDrag] = useState<{ x: number; y: number } | null>(null);

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

  const computeRow = useCallback((clientX: number, clientY: number): number | null => {
    const svg = canvasSvgRef.current;
    if (!svg || rowGaps.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const { offsetY } = BEAD_THEME.gridDefaults;
    const svgY = (clientY - rect.top) / zoom - offsetY;

    let best: { row: number; dist: number } | null = null;
    for (const { row, midY } of rowGaps) {
      const dist = Math.abs(svgY - midY);
      if (!best || dist < best.dist) best = { row, dist };
    }
    return best && best.dist < 40 ? best.row : null;
  }, [canvasSvgRef, rowGaps, zoom]);

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

  useEffect(() => {
    if (!decorDrag) return;
    const onMove = (e: PointerEvent) => {
      setDecorDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      onHoveredRowChange(computeRow(e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      const row = computeRow(e.clientX, e.clientY);
      if (row !== null) onDecorDrop(row);
      onHoveredRowChange(null);
      setDecorDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [decorDrag, computeRow, onHoveredRowChange, onDecorDrop]);

  const dragTemplate = drag
    ? templates.find((t) => t.id === drag.templateId) ?? null
    : null;

  const activeBands = useMemo(
    () => rowGaps
      .map((g, i) => ({ row: g.row, count: decorBands[g.row] ?? 0, gapIndex: i + 1 }))
      .filter(item => item.count > 0),
    [rowGaps, decorBands],
  );

  return (
    <>
      <aside className={`pendants-sidebar${open ? ' pendants-sidebar--open' : ''}`}>
        <div className="sidebar-tabs">
          <button
            type="button"
            className={`sidebar-tab${activeTab === 'pendants' ? ' sidebar-tab--active' : ''}`}
            onClick={() => setActiveTab('pendants')}
          >
            Pendants
          </button>
          <button
            type="button"
            className={`sidebar-tab${activeTab === 'decor' ? ' sidebar-tab--active' : ''}`}
            onClick={() => setActiveTab('decor')}
          >
            Decor
          </button>
        </div>

        {activeTab === 'pendants' && (
          <>
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
          </>
        )}

        {activeTab === 'decor' && (
          <>
            <div className="pendants-sidebar__catalog decor-catalog">
              <button
                type="button"
                className="pendant-card"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDecorDrag({ x: e.clientX, y: e.clientY });
                }}
              >
                <div className="pendant-card__preview">
                  <BandPreview />
                </div>
                <span className="pendant-card__name">Band</span>
              </button>
            </div>

            {activeBands.length > 0 && (
              <div className="decor-bands-list">
                <div className="decor-bands-list__title">Placed</div>
                {activeBands.map(({ row, count, gapIndex }) => (
                  <div key={row} className="decor-band-item">
                    <span className="decor-band-item__label">Gap {gapIndex}</span>
                    <div className="decor-band-item__controls">
                      <button
                        type="button"
                        className="decor-band-item__btn"
                        onClick={() => onDecorCount(row, -1)}
                      >
                        −
                      </button>
                      <span className="decor-band-item__count">{count}</span>
                      <button
                        type="button"
                        className="decor-band-item__btn"
                        onClick={() => onDecorCount(row, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pendants-sidebar__footer">
              <button
                type="button"
                className="pendants-sidebar__clear"
                onClick={onClearDecor}
                disabled={activeBands.length === 0}
              >
                Reset all
              </button>
              <p className="pendants-sidebar__hint">
                Drag a band onto a row gap
              </p>
            </div>
          </>
        )}
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

      {decorDrag && createPortal(
        <div
          className="pendant-drag-ghost decor-drag-ghost"
          style={{ left: decorDrag.x, top: decorDrag.y }}
        >
          <BandPreview />
        </div>,
        document.body,
      )}
    </>
  );
};
