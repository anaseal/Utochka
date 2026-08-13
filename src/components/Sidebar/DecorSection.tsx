import { useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw } from 'lucide-react';
import { DecorTailPlacement } from '../../types/pendant';
import { SectionHelp } from '../common/SectionHelp';
import { IconButton } from '../common/IconButton';
import { BandPreview, TailPreview } from './PendantPreviews';
import { useSidebarDragDrop } from '../../hooks/useSidebarDragDrop';

interface DecorSectionProps {
  bottomEdgeEnabled: boolean;
  decorBands: Record<number, number>;
  rowGaps: { row: number; midY: number }[];
  computeRow: (clientX: number, clientY: number) => number | null;
  onHoveredRowChange: (row: number | null) => void;
  onDecorDrop: (nodeRow: number) => void;
  onDecorCount: (nodeRow: number, delta: number) => void;
  onClearDecor: () => void;
  decorTailPlacements: DecorTailPlacement[];
  computeCol: (clientX: number, clientY: number) => number | null;
  onHoveredDecorTailColChange: (col: number | null) => void;
  onAddDecorTail: (col: number) => void;
  onUpdateDecorTailLength: (placementId: string, delta: number) => void;
  onRemoveDecorTail: (placementId: string) => void;
  onClearDecorTails: () => void;
}

export const DecorSection = ({
  bottomEdgeEnabled,
  decorBands,
  rowGaps,
  computeRow,
  onHoveredRowChange,
  onDecorDrop,
  onDecorCount,
  onClearDecor,
  decorTailPlacements,
  computeCol,
  onHoveredDecorTailColChange,
  onAddDecorTail,
  onUpdateDecorTailLength,
  onRemoveDecorTail,
  onClearDecorTails,
}: DecorSectionProps) => {
  const band = useSidebarDragDrop<undefined, number>({
    computeTarget: computeRow,
    onHoverChange: onHoveredRowChange,
    onDrop: useCallback((_payload: undefined, row: number) => onDecorDrop(row), [onDecorDrop]),
  });
  const tail = useSidebarDragDrop<undefined, number>({
    computeTarget: computeCol,
    onHoverChange: onHoveredDecorTailColChange,
    onDrop: useCallback((_payload: undefined, col: number) => onAddDecorTail(col), [onAddDecorTail]),
  });

  const activeBands = useMemo(
    () => rowGaps
      .map((g, i) => ({ row: g.row, count: decorBands[g.row] ?? 0, gapIndex: i + 1 }))
      .filter(item => item.count > 0),
    [rowGaps, decorBands],
  );

  const hasDecorTails = decorTailPlacements.length > 0;

  const handleClearDecorSection = useCallback(() => {
    onClearDecor();
    onClearDecorTails();
  }, [onClearDecor, onClearDecorTails]);

  return (
    <section className="sidebar__section">
      <header className="sidebar__section-heading">
        <div className="sidebar__section-heading-row">
          <span className="sidebar__section-heading-label">
            <h3 className="sidebar__section-title">Decor</h3>
            <SectionHelp text="A band fills the gap between two rows across the whole width — its ± sets how many beads sit in the gap of one column. A tail hangs from a single node of the bottom row, and its last bead holds a pendant the same way a node does." />
          </span>
          <IconButton
            size="sm"
            shape="square"
            variant="ghost"
            onClick={handleClearDecorSection}
            disabled={activeBands.length === 0 && !hasDecorTails}
            aria-label="Clear Decor"
            title="Clear Decor"
            icon={<RotateCcw size={13} />}
          />
        </div>
        {/* Две карточки — две разные цели драга, и по превью их не различить:
            без этой строки Band уезжает на ноду, а Tail в промежуток, и оба
            раза ничего не происходит. */}
        <p className="sidebar__section-desc">
          Drag Band into a gap between rows, Tail onto a bottom-row node
        </p>
      </header>
      <div className="pendants-sidebar__catalog decor-catalog">
        <button
          type="button"
          className="pendant-card"
          onPointerDown={(e) => band.start(e, undefined)}
          onPointerMove={band.move}
          onPointerUp={band.cancel}
          onPointerCancel={band.cancel}
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
            tail.start(e, undefined);
          }}
          onPointerMove={tail.move}
          onPointerUp={tail.cancel}
          onPointerCancel={tail.cancel}
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

      {/* Гаснет только Tail: хвосты растут из нижнего ряда, который занимает
          Bottom Chain, а Band ложится в промежуток между рядами и работает
          всегда — иначе погашенная карточка читается как поломка секции. */}
      {bottomEdgeEnabled && (
        <p className="sidebar__hint">
          Turn off Bottom Chain (Grid tab) to place tails; bands work either way.
        </p>
      )}

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
                  aria-label={`Fewer beads in gap ${gapIndex}`}
                >
                  −
                </button>
                <span className="decor-band-item__count">{count}</span>
                <button
                  type="button"
                  className="decor-band-item__btn"
                  onClick={() => onDecorCount(row, 1)}
                  aria-label={`More beads in gap ${gapIndex}`}
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
          {decorTailPlacements.map((tailPlacement) => (
            <div key={tailPlacement.placementId} className="decor-band-item">
              <span className="decor-band-item__label">Col {tailPlacement.col}</span>
              <div className="decor-band-item__controls">
                <button
                  type="button"
                  className="decor-band-item__btn"
                  onClick={() => onUpdateDecorTailLength(tailPlacement.placementId, -1)}
                  aria-label={`Shorten tail at col ${tailPlacement.col}`}
                >
                  −
                </button>
                <span className="decor-band-item__count">{tailPlacement.rows}</span>
                <button
                  type="button"
                  className="decor-band-item__btn"
                  onClick={() => onUpdateDecorTailLength(tailPlacement.placementId, 1)}
                  aria-label={`Lengthen tail at col ${tailPlacement.col}`}
                >
                  +
                </button>
                <button
                  type="button"
                  className="decor-band-item__btn"
                  onClick={() => onRemoveDecorTail(tailPlacement.placementId)}
                  aria-label={`Remove tail at col ${tailPlacement.col}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {band.drag && createPortal(
        <div
          className="pendant-drag-ghost decor-drag-ghost"
          style={{ left: band.drag.x, top: band.drag.y }}
        >
          <BandPreview />
        </div>,
        document.body,
      )}

      {tail.drag && createPortal(
        <div
          className="pendant-drag-ghost decor-drag-ghost"
          style={{ left: tail.drag.x, top: tail.drag.y }}
        >
          <TailPreview />
        </div>,
        document.body,
      )}
    </section>
  );
};
