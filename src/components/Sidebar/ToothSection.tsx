import { RotateCcw } from 'lucide-react';
import { ToothPlacement } from '../../types/pendant';
import { SectionHelp } from '../common/SectionHelp';

interface ToothSectionProps {
  teeth: ToothPlacement[];
  toothToolActive: boolean;
  onToggleToothTool: () => void;
  toothPendingStart: number | null;
  onRemoveTooth: (placementId: string) => void;
  onClearTeeth: () => void;
}

export const ToothSection = ({
  teeth,
  toothToolActive,
  onToggleToothTool,
  toothPendingStart,
  onRemoveTooth,
  onClearTeeth,
}: ToothSectionProps) => (
  <section className="sidebar__section">
    <header className="sidebar__section-heading">
      <div className="sidebar__section-heading-row">
        <span className="sidebar__section-heading-label">
          <h3 className="sidebar__section-title">Teeth</h3>
          <SectionHelp text="Grow a tapering tooth from a strip of bottom-row beads. Pick a start node and an end node — the tooth converges to a point on its own, no length to set. Overlapping teeth aren't allowed." />
        </span>
        <button
          type="button"
          className="sidebar__section-clear"
          onClick={onClearTeeth}
          disabled={teeth.length === 0}
          aria-label="Clear Teeth"
          title="Clear Teeth"
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <p className="sidebar__section-desc">
        {toothToolActive
          ? (toothPendingStart !== null
            ? 'Click the end node on the bottom row'
            : 'Click the start node on the bottom row')
          : 'Tap "Pick tooth range" to start'}
      </p>
    </header>
    <button
      type="button"
      className={`sidebar__tool-toggle${toothToolActive ? ' sidebar__tool-toggle--active' : ''}`}
      onClick={onToggleToothTool}
      aria-pressed={toothToolActive}
    >
      {toothToolActive ? 'Picking nodes…' : 'Pick tooth range'}
    </button>

    {teeth.length > 0 && (
      <div className="decor-bands-list">
        <div className="decor-bands-list__title">Placed</div>
        {teeth.map((t, i) => (
          <div key={t.placementId} className="decor-band-item">
            <span className="decor-band-item__label">
              Tooth {i + 1}: col {t.startCol} → {t.endCol}
            </span>
            <button
              type="button"
              className="decor-band-item__btn"
              onClick={() => onRemoveTooth(t.placementId)}
              aria-label={`Remove tooth ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
  </section>
);
