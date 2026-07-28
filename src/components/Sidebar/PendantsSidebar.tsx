import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw } from 'lucide-react';
import { Bead } from '../../types/bead';
import { PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement } from '../../types/pendant';
import { BEAD_THEME } from '../../config/theme';
import { SectionHelp } from '../common/SectionHelp';
import './Sidebar.css';
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
  // Индивидуальный декор-хвост — точечно на одну ноду нижнего ряда (в отличие
  // от Decor Bands выше, полосы на весь ряд). Подвески в свою очередь можно
  // навесить на кончик хвоста той же колонки (см. pendantAnchors в
  // useSilyankaProject.ts, spec.md «Декор-хвост»).
  decorTailPlacements: DecorTailPlacement[];
  onAddDecorTail: (col: number) => void;
  onUpdateDecorTailLength: (placementId: string, delta: number) => void;
  onRemoveDecorTail: (placementId: string) => void;
  onClearDecorTails: () => void;
  onHoveredDecorTailColChange: (col: number | null) => void;
  // Bottom Chain теперь включается/выключается в панели «Сетка» (GridSidebar) —
  // здесь только читаем флаг, чтобы блокировать карточки подвесок (взаимоисключение,
  // см. spec.md, «Взаимоисключение с Bottom Chain»).
  bottomEdgeEnabled: boolean;
  pendantChains: PendantChain[];
  chainToolActive: boolean;
  onToggleChainTool: () => void;
  chainPendingStart: number | null;
  onRemoveChain: (placementId: string) => void;
  onClearChains: () => void;
}

const ANCHOR_R = 18;

// Порог смещения (в клиентских пикселях, без учёта zoom), с которого тач
// на карточке подвески/декора считается драгом, а не листанием сайдбара —
// то же значение и та же идея, что STAMP_DRAG_THRESHOLD_TOUCH в CanvasView.tsx.
// На мыши порог не нужен (нет конкурирующего нативного скролла), там драг
// стартует сразу по pointerdown, как раньше.
const PENDANT_DRAG_THRESHOLD_TOUCH = 10;

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

// В отличие от Band (полоса без якоря — свободно висит между рядами), хвост
// всегда крепится к одной ноде — якорный кружок сверху, как у PendantPreview,
// показывает это отличие на глаз.
const TAIL_YS = [14, 24, 34, 44] as const;

const TailPreview = () => (
  <svg
    viewBox="-26 -26 52 76"
    className="pendant-preview"
    preserveAspectRatio="xMidYMid meet"
  >
    <circle className="pendant-preview__anchor" cx={0} cy={0} r={ANCHOR_R} />
    {TAIL_YS.map((y) => (
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
  decorTailPlacements,
  onAddDecorTail,
  onUpdateDecorTailLength,
  onRemoveDecorTail,
  onClearDecorTails,
  onHoveredDecorTailColChange,
  bottomEdgeEnabled,
  pendantChains,
  chainToolActive,
  onToggleChainTool,
  chainPendingStart,
  onRemoveChain,
  onClearChains,
}: PendantsSidebarProps) => {
  const [drag, setDrag] = useState<{ templateId: string; x: number; y: number } | null>(null);
  const [decorDrag, setDecorDrag] = useState<{ x: number; y: number } | null>(null);
  const [tailDrag, setTailDrag] = useState<{ x: number; y: number } | null>(null);

  // Тач ещё не признан драгом (см. PENDANT_DRAG_THRESHOLD_TOUCH) — в ref, а
  // не в state: пока порог не пройден, никакого ре-рендера быть не должно.
  const pendingDragRef = useRef<{ templateId: string; x: number; y: number } | null>(null);
  const pendingDecorDragRef = useRef<{ x: number; y: number } | null>(null);
  const pendingTailDragRef = useRef<{ x: number; y: number } | null>(null);

  const startPendantDrag = useCallback((e: React.PointerEvent, templateId: string) => {
    if (e.pointerType === 'touch') {
      // Не preventDefault и не setDrag сразу: touch-action:pan-y на карточке
      // (см. PendantsSidebar.css) даёт браузеру шанс распознать это как
      // вертикальный скролл сайдбара раньше, чем сработает наш порог ниже.
      pendingDragRef.current = { templateId, x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    setDrag({ templateId, x: e.clientX, y: e.clientY });
  }, []);

  const movePendantDrag = useCallback((e: React.PointerEvent) => {
    const pending = pendingDragRef.current;
    if (!pending) return;
    const dx = e.clientX - pending.x;
    const dy = e.clientY - pending.y;
    if (Math.hypot(dx, dy) < PENDANT_DRAG_THRESHOLD_TOUCH) return;
    pendingDragRef.current = null;
    e.preventDefault();
    setDrag({ templateId: pending.templateId, x: e.clientX, y: e.clientY });
  }, []);

  const cancelPendantDrag = useCallback(() => {
    pendingDragRef.current = null;
  }, []);

  const startDecorDrag = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      pendingDecorDragRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    setDecorDrag({ x: e.clientX, y: e.clientY });
  }, []);

  const moveDecorDrag = useCallback((e: React.PointerEvent) => {
    const pending = pendingDecorDragRef.current;
    if (!pending) return;
    const dx = e.clientX - pending.x;
    const dy = e.clientY - pending.y;
    if (Math.hypot(dx, dy) < PENDANT_DRAG_THRESHOLD_TOUCH) return;
    pendingDecorDragRef.current = null;
    e.preventDefault();
    setDecorDrag({ x: e.clientX, y: e.clientY });
  }, []);

  const cancelDecorDrag = useCallback(() => {
    pendingDecorDragRef.current = null;
  }, []);

  const startTailDrag = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      pendingTailDragRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    setTailDrag({ x: e.clientX, y: e.clientY });
  }, []);

  const moveTailDrag = useCallback((e: React.PointerEvent) => {
    const pending = pendingTailDragRef.current;
    if (!pending) return;
    const dx = e.clientX - pending.x;
    const dy = e.clientY - pending.y;
    if (Math.hypot(dx, dy) < PENDANT_DRAG_THRESHOLD_TOUCH) return;
    pendingTailDragRef.current = null;
    e.preventDefault();
    setTailDrag({ x: e.clientX, y: e.clientY });
  }, []);

  const cancelTailDrag = useCallback(() => {
    pendingTailDragRef.current = null;
  }, []);

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

  const computeRow = useCallback((clientY: number): number | null => {
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
    // pointermove на десктопе может сыпаться чаще частоты кадров экрана —
    // без коалессинга через rAF каждое событие немедленно триггерит setState
    // (drag.x/y + hoveredCol), а значит и полный ре-рендер App/CanvasView,
    // что на большой сетке ощущается как лаг при перетаскивании подвески.
    let rafId: number | null = null;
    let pending: { x: number; y: number } | null = null;
    const flush = () => {
      rafId = null;
      const point = pending;
      if (!point) return;
      setDrag((d) => (d ? { ...d, x: point.x, y: point.y } : d));
      onHoveredColChange(computeCol(point.x, point.y));
    };
    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    const onUp = (e: PointerEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const col = computeCol(e.clientX, e.clientY);
      if (col !== null) onAddPlacement(drag.templateId, col);
      onHoveredColChange(null);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, computeCol, onHoveredColChange, onAddPlacement]);

  useEffect(() => {
    if (!decorDrag) return;
    let rafId: number | null = null;
    let pending: { x: number; y: number } | null = null;
    const flush = () => {
      rafId = null;
      const point = pending;
      if (!point) return;
      setDecorDrag((d) => (d ? { ...d, x: point.x, y: point.y } : d));
      onHoveredRowChange(computeRow(point.y));
    };
    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    const onUp = (e: PointerEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const row = computeRow(e.clientY);
      if (row !== null) onDecorDrop(row);
      onHoveredRowChange(null);
      setDecorDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [decorDrag, computeRow, onHoveredRowChange, onDecorDrop]);

  useEffect(() => {
    if (!tailDrag) return;
    let rafId: number | null = null;
    let pending: { x: number; y: number } | null = null;
    const flush = () => {
      rafId = null;
      const point = pending;
      if (!point) return;
      setTailDrag((d) => (d ? { ...d, x: point.x, y: point.y } : d));
      onHoveredDecorTailColChange(computeCol(point.x, point.y));
    };
    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY };
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    const onUp = (e: PointerEvent) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const col = computeCol(e.clientX, e.clientY);
      if (col !== null) onAddDecorTail(col);
      onHoveredDecorTailColChange(null);
      setTailDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [tailDrag, computeCol, onHoveredDecorTailColChange, onAddDecorTail]);

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
  const hasDecorTails = decorTailPlacements.length > 0;

  const handleClearAll = useCallback(() => {
    onClearAll();
    onClearDecor();
    onClearChains();
    onClearDecorTails();
  }, [onClearAll, onClearDecor, onClearChains, onClearDecorTails]);

  const handleClearDecorSection = useCallback(() => {
    onClearDecor();
    onClearDecorTails();
  }, [onClearDecor, onClearDecorTails]);

  return (
    <>
      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <h2 className="sidebar__title">Pendants &amp; Decor</h2>
        </div>

        <div className="sidebar__body">
          <section className="sidebar__section">
            <header className="sidebar__section-heading">
              <div className="sidebar__section-heading-row">
                <span className="sidebar__section-heading-label">
                  <h3 className="sidebar__section-title">Pendants</h3>
                  <SectionHelp text="Drag a design onto a bottom-row bead." />
                </span>
                <button
                  type="button"
                  className="sidebar__section-clear"
                  onClick={onClearAll}
                  disabled={!hasPendants}
                  aria-label="Clear Pendants"
                  title="Clear Pendants"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
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
                      startPendantDrag(e, template.id);
                    }}
                    onPointerMove={movePendantDrag}
                    onPointerUp={cancelPendantDrag}
                    onPointerCancel={cancelPendantDrag}
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

          <section className="sidebar__section">
            <header className="sidebar__section-heading">
              <div className="sidebar__section-heading-row">
                <span className="sidebar__section-heading-label">
                  <h3 className="sidebar__section-title">Chains</h3>
                  <SectionHelp text="Link two bottom-row beads with a chain." />
                </span>
                <button
                  type="button"
                  className="sidebar__section-clear"
                  onClick={onClearChains}
                  disabled={pendantChains.length === 0}
                  aria-label="Clear Chains"
                  title="Clear Chains"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
              <p className="sidebar__section-desc">
                {chainToolActive
                  ? (chainPendingStart !== null
                    ? 'Click the end node on the bottom row'
                    : 'Click the start node on the bottom row')
                  : 'Tap "Pick chain nodes" to start'}
              </p>
            </header>
            <button
              type="button"
              className={`chain-tool-toggle${chainToolActive ? ' chain-tool-toggle--active' : ''}`}
              onClick={onToggleChainTool}
              aria-pressed={chainToolActive}
            >
              {chainToolActive ? 'Picking nodes…' : 'Pick chain nodes'}
            </button>

            {pendantChains.length > 0 && (
              <div className="decor-bands-list">
                <div className="decor-bands-list__title">Placed</div>
                {pendantChains.map((c, i) => (
                  <div key={c.placementId} className="decor-band-item">
                    <span className="decor-band-item__label">
                      Chain {i + 1}: col {c.startCol} → {c.endCol}
                    </span>
                    <button
                      type="button"
                      className="decor-band-item__btn"
                      onClick={() => onRemoveChain(c.placementId)}
                      aria-label={`Remove chain ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sidebar__section">
            <header className="sidebar__section-heading">
              <div className="sidebar__section-heading-row">
                <span className="sidebar__section-heading-label">
                  <h3 className="sidebar__section-title">Decor</h3>
                  <SectionHelp text="Drag a band into a gap between rows, or a tail onto a bottom-row node." />
                </span>
                <button
                  type="button"
                  className="sidebar__section-clear"
                  onClick={handleClearDecorSection}
                  disabled={activeBands.length === 0 && !hasDecorTails}
                  aria-label="Clear Decor"
                  title="Clear Decor"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </header>
            <div className="pendants-sidebar__catalog decor-catalog">
              <button
                type="button"
                className="pendant-card"
                onPointerDown={startDecorDrag}
                onPointerMove={moveDecorDrag}
                onPointerUp={cancelDecorDrag}
                onPointerCancel={cancelDecorDrag}
              >
                <div className="pendant-card__preview">
                  <BandPreview />
                </div>
                <span className="pendant-card__name">Band</span>
              </button>

              <button
                type="button"
                className={`pendant-card${bottomEdgeEnabled ? ' pendant-card--disabled' : ''}`}
                aria-disabled={bottomEdgeEnabled}
                onPointerDown={(e) => {
                  if (bottomEdgeEnabled) return;
                  startTailDrag(e);
                }}
                onPointerMove={moveTailDrag}
                onPointerUp={cancelTailDrag}
                onPointerCancel={cancelTailDrag}
              >
                <div className="pendant-card__preview">
                  <TailPreview />
                </div>
                <span className="pendant-card__name">Tail</span>
                {decorTailPlacements.length > 0 && (
                  <span className="pendant-card__badge">{decorTailPlacements.length}</span>
                )}
              </button>
            </div>

            {activeBands.length > 0 && (
              <div className="decor-bands-list">
                <div className="decor-bands-list__title">Bands placed</div>
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

            {hasDecorTails && (
              <div className="decor-bands-list">
                <div className="decor-bands-list__title">Tails placed</div>
                {decorTailPlacements.map((tail) => (
                  <div key={tail.placementId} className="decor-band-item">
                    <span className="decor-band-item__label">Col {tail.col}</span>
                    <div className="decor-band-item__controls">
                      <button
                        type="button"
                        className="decor-band-item__btn"
                        onClick={() => onUpdateDecorTailLength(tail.placementId, -1)}
                      >
                        −
                      </button>
                      <span className="decor-band-item__count">{tail.rows}</span>
                      <button
                        type="button"
                        className="decor-band-item__btn"
                        onClick={() => onUpdateDecorTailLength(tail.placementId, 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="decor-band-item__btn"
                        onClick={() => onRemoveDecorTail(tail.placementId)}
                        aria-label={`Remove tail at col ${tail.col}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="sidebar__footer">
          <button
            type="button"
            className="sidebar__clear"
            onClick={handleClearAll}
            disabled={!hasPendants && activeBands.length === 0 && pendantChains.length === 0 && !hasDecorTails}
          >
            Reset all
          </button>
          <p className="sidebar__hint">
            {bottomEdgeEnabled
              ? 'Drag a band onto a row gap (pendants and tails unavailable while Bottom Chain is on)'
              : 'Drag a pendant or a tail onto a bottom-row node, or a band onto a row gap'}
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

      {tailDrag && createPortal(
        <div
          className="pendant-drag-ghost decor-drag-ghost"
          style={{ left: tailDrag.x, top: tailDrag.y }}
        >
          <TailPreview />
        </div>,
        document.body,
      )}
    </>
  );
};
