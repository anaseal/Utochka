import { Circle, RotateCcw, Trash2, Waypoints } from 'lucide-react';
import { SectionHelp } from '../common/SectionHelp';

interface HolesSectionProps {
  holeToolActive: boolean;
  onToggleHoleTool: () => void;
  holeSegmentToolActive: boolean;
  onToggleHoleSegmentTool: () => void;
  hasDeletedBeads: boolean;
  onClearDeletedBeads: () => void;
  // Bead и Segment только помечают бисерины пунктиром — реальное удаление
  // требует подтверждения этой кнопкой (см. useSilyankaProject.
  // pendingDeleteIds/confirmPendingDelete). Общий счётчик на оба
  // под-инструмента: они пишут в один и тот же список пометок.
  pendingDeleteCount: number;
  onConfirmPendingDelete: () => void;
}

export const HolesSection = ({
  holeToolActive,
  onToggleHoleTool,
  holeSegmentToolActive,
  onToggleHoleSegmentTool,
  hasDeletedBeads,
  onClearDeletedBeads,
  pendingDeleteCount,
  onConfirmPendingDelete,
}: HolesSectionProps) => (
  <section className="sidebar__section">
    <header className="sidebar__section-heading">
      <div className="sidebar__section-heading-row">
        <span className="sidebar__section-heading-label">
          <h3 className="sidebar__section-title">Holes</h3>
          <SectionHelp text="Removes beads from the weave. Bead marks one clicked bead; Segment marks a node and every span attached to it — hover a node to preview what will go. Marked beads are dashed until you confirm with Delete below. Click a ghost outline to bring an already-deleted bead back." />
        </span>
        <button
          type="button"
          className="sidebar__section-clear"
          onClick={onClearDeletedBeads}
          disabled={!hasDeletedBeads}
          aria-label="Restore all beads"
          title="Restore all beads"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </header>
    <div className="sidebar__tool-picker">
      <button
        type="button"
        className={`sidebar__tool-picker__btn${holeToolActive ? ' sidebar__tool-picker__btn--active' : ''}`}
        onClick={onToggleHoleTool}
        aria-pressed={holeToolActive}
        title="Click a bead to mark it for deletion"
      >
        <Circle size={14} />
        <span>Bead</span>
      </button>
      <button
        type="button"
        className={`sidebar__tool-picker__btn${holeSegmentToolActive ? ' sidebar__tool-picker__btn--active' : ''}`}
        onClick={onToggleHoleSegmentTool}
        aria-pressed={holeSegmentToolActive}
        title="Click a node to mark it and every span connected to it"
      >
        <Waypoints size={14} />
        <span>Segment</span>
      </button>
    </div>
    <button
      type="button"
      className="sidebar__confirm-delete"
      onClick={onConfirmPendingDelete}
      disabled={pendingDeleteCount === 0}
    >
      <Trash2 size={13} />
      {pendingDeleteCount > 0
        ? `Delete ${pendingDeleteCount} bead${pendingDeleteCount === 1 ? '' : 's'}`
        : 'Delete marked beads'}
    </button>
    <div className="sidebar__section-divider" />
  </section>
);
