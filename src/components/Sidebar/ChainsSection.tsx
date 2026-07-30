import { RotateCcw } from 'lucide-react';
import { PendantChain } from '../../types/pendant';
import { SectionHelp } from '../common/SectionHelp';

interface ChainsSectionProps {
  pendantChains: PendantChain[];
  chainToolActive: boolean;
  onToggleChainTool: () => void;
  chainPendingStart: number | null;
  onRemoveChain: (placementId: string) => void;
  onClearChains: () => void;
}

export const ChainsSection = ({
  pendantChains,
  chainToolActive,
  onToggleChainTool,
  chainPendingStart,
  onRemoveChain,
  onClearChains,
}: ChainsSectionProps) => (
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
      className={`sidebar__tool-toggle${chainToolActive ? ' sidebar__tool-toggle--active' : ''}`}
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
);
