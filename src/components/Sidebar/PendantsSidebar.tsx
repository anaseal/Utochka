import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bead } from '../../types/bead';
import { PendantPlacement, PendantTemplate } from '../../types/pendant';
import { BEAD_THEME } from '../../config/theme';
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
  bottomEdgeEnabled: boolean;
  onBottomEdgeToggle: () => void;
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
      {template.beads.map((bead, index) => {
        const beadTypeClass = bead.type === 'NODE' ? 'bead--type-node' : 'bead--type-span';
        return (
          <g key={index} className={`bead ${beadTypeClass} bead--empty`}>
            {bead.shape === 'circle' ? (
              <circle
                className="bead__body"
                cx={bead.dx}
                cy={bead.dy}
                r={bead.r ?? 0}
              />
            ) : (
              <rect
                className="bead__body"
                x={bead.dx - (bead.w ?? 0) / 2}
                y={bead.dy - (bead.h ?? 0) / 2}
                width={bead.w ?? 0}
                height={bead.h ?? 0}
                rx={4}
              />
            )}
          </g>
        );
      })}
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
      <g key={y} className="bead bead--type-span bead--empty">
        <circle className="bead__body" cx={0} cy={y} r={6} />
      </g>
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
  bottomEdgeEnabled,
  onBottomEdgeToggle,
}: PendantsSidebarProps) => {
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

  const hasPendants = placements.length > 0;

  const handleClearAll = useCallback(() => {
    onClearAll();
    onClearDecor();
    if (bottomEdgeEnabled) onBottomEdgeToggle();
  }, [onClearAll, onClearDecor, bottomEdgeEnabled, onBottomEdgeToggle]);

  return (
    <>
      <aside className={`pendants-sidebar${open ? ' pendants-sidebar--open' : ''}`}>
        <div className="pendants-sidebar__header">
          <h2 className="pendants-sidebar__title">Pendants &amp; Decor</h2>
        </div>

        <div className="pendants-sidebar__body">
          <section className="pendants-sidebar__section">
            <header className="pendants-sidebar__section-heading">
              <div className="pendants-sidebar__section-heading-row">
                <h3 className="pendants-sidebar__section-title">Bottom Chain</h3>
                <button
                  type="button"
                  className="pendants-sidebar__section-clear"
                  onClick={onBottomEdgeToggle}
                  disabled={!bottomEdgeEnabled}
                  aria-label="Clear Bottom Chain"
                  title="Clear Bottom Chain"
                >
                  ×
                </button>
              </div>
              <p className="pendants-sidebar__section-desc">Decorative edge added below the last row</p>
            </header>
            <div className="bottom-chain-control">
              <button
                type="button"
                className={`bottom-chain-control__toggle${bottomEdgeEnabled ? ' bottom-chain-control__toggle--active' : ''}`}
                onClick={onBottomEdgeToggle}
                aria-pressed={bottomEdgeEnabled}
                aria-label="Toggle Bottom Chain"
                disabled={!bottomEdgeEnabled && hasPendants}
                title={!bottomEdgeEnabled && hasPendants ? 'Clear pendants to enable Bottom Chain' : undefined}
              />
              {!bottomEdgeEnabled && hasPendants && (
                <p className="bottom-chain-control__hint">
                  Clear pendants (above) to enable Bottom Chain
                </p>
              )}
            </div>
          </section>

          <section className="pendants-sidebar__section">
            <header className="pendants-sidebar__section-heading">
              <div className="pendants-sidebar__section-heading-row">
                <h3 className="pendants-sidebar__section-title">Pendants</h3>
                <button
                  type="button"
                  className="pendants-sidebar__section-clear"
                  onClick={onClearAll}
                  disabled={!hasPendants}
                  aria-label="Clear Pendants"
                  title="Clear Pendants"
                >
                  ×
                </button>
              </div>
              <p className="pendants-sidebar__section-desc">Drag a template onto a bottom-row node</p>
            </header>
            <div className="pendants-sidebar__catalog">
              {templates.map((template) => {
                const placedCount = placements.filter((p) => p.templateId === template.id).length;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={`pendant-card${bottomEdgeEnabled ? ' pendant-card--disabled' : ''}`}
                    aria-disabled={bottomEdgeEnabled}
                    onPointerDown={(e) => {
                      if (bottomEdgeEnabled) return;
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
          </section>

          <section className="pendants-sidebar__section">
            <header className="pendants-sidebar__section-heading">
              <div className="pendants-sidebar__section-heading-row">
                <h3 className="pendants-sidebar__section-title">Decor</h3>
                <button
                  type="button"
                  className="pendants-sidebar__section-clear"
                  onClick={onClearDecor}
                  disabled={activeBands.length === 0}
                  aria-label="Clear Decor"
                  title="Clear Decor"
                >
                  ×
                </button>
              </div>
              <p className="pendants-sidebar__section-desc">Drag a band onto a gap between rows</p>
            </header>
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
          </section>
        </div>

        <div className="pendants-sidebar__footer">
          <button
            type="button"
            className="pendants-sidebar__clear"
            onClick={handleClearAll}
            disabled={!hasPendants && activeBands.length === 0 && !bottomEdgeEnabled}
          >
            Reset all
          </button>
          <p className="pendants-sidebar__hint">
            {bottomEdgeEnabled
              ? 'Drag a band onto a row gap (pendants unavailable while Bottom Chain is on)'
              : 'Drag a pendant onto a bottom-row node, or a band onto a row gap'}
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
