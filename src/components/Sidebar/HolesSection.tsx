import { Circle, RotateCcw, Waypoints } from 'lucide-react';
import { SectionHelp } from '../common/SectionHelp';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';

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
          <SectionHelp text="Removes beads from the weave. Bead marks one clicked bead; Segment marks a node and every span attached to it — hover a node to preview what will go. With Mirror Mode on, the mirrored bead or segment is marked too. Marked beads are dashed until you confirm with Delete below. Deleted beads are not covered by Undo — use Restore all (↺ above) to bring them all back." />
        </span>
        <IconButton
          size="sm"
          shape="square"
          variant="ghost"
          onClick={onClearDeletedBeads}
          disabled={!hasDeletedBeads}
          aria-label="Restore all beads"
          title="Restore all beads"
          icon={<RotateCcw size={13} />}
        />
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
    {/* primary, а не danger: Bead/Segment уже показали пунктиром, что уйдёт, и
        это кнопка «применить набранное», а не последний рубеж перед
        необратимым сносом — красный читался как что-то опасное и отпугивал
        от нажатия. */}
    <Button
      variant="primary"
      size="md"
      className="sidebar__action"
      onClick={onConfirmPendingDelete}
      disabled={pendingDeleteCount === 0}
    >
      {pendingDeleteCount > 0
        ? `Delete ${pendingDeleteCount} bead${pendingDeleteCount === 1 ? '' : 's'}`
        : 'Delete marked beads'}
    </Button>
    <div className="sidebar__section-divider" />
  </section>
);
