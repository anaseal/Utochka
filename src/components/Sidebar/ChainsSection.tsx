import { RotateCcw } from 'lucide-react';
import { PendantChain, ChainEndpoint, ToothPlacement } from '../../types/pendant';
import { SectionHelp } from '../common/SectionHelp';

interface ChainsSectionProps {
  pendantChains: PendantChain[];
  // Только для человекочитаемой метки «tooth #N» в списке ниже (индекс
  // зубца в массиве, т.к. placementId — uuid).
  teeth: ToothPlacement[];
  chainToolActive: boolean;
  onToggleChainTool: () => void;
  chainPendingStart: ChainEndpoint | null;
  onRemoveChain: (placementId: string) => void;
  onClearChains: () => void;
}

const formatChainEndpoint = (endpoint: ChainEndpoint, teeth: ToothPlacement[]): string => {
  if (endpoint.kind === 'grid') return `col ${endpoint.col}`;
  const index = teeth.findIndex(t => t.placementId === endpoint.placementId);
  return index >= 0 ? `tooth ${index + 1}` : 'tooth';
};

export const ChainsSection = ({
  pendantChains,
  teeth,
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
          <SectionHelp text="Link two beads with a chain — bottom-row nodes or tooth edge nodes. Two nodes on the same tooth must be on the same side." />
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
            ? 'Click the end node — bottom row or a tooth edge'
            : 'Click the start node — bottom row or a tooth edge')
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
              Chain {i + 1}: {formatChainEndpoint(c.start, teeth)} → {formatChainEndpoint(c.end, teeth)}
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
