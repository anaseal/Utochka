import { createPortal } from 'react-dom';
import { RotateCcw } from 'lucide-react';
import { PendantPlacement, PendantTemplate } from '../../types/pendant';
import { SectionHelp } from '../common/SectionHelp';
import { PendantPreview } from './PendantPreviews';
import { useSidebarDragDrop } from '../../hooks/useSidebarDragDrop';

interface PendantsCatalogSectionProps {
  templates: PendantTemplate[];
  placements: PendantPlacement[];
  bottomEdgeEnabled: boolean;
  computeCol: (clientX: number, clientY: number) => number | null;
  onHoveredColChange: (col: number | null) => void;
  onAddPlacement: (templateId: string, col: number) => void;
  onClearAll: () => void;
}

export const PendantsCatalogSection = ({
  templates,
  placements,
  bottomEdgeEnabled,
  computeCol,
  onHoveredColChange,
  onAddPlacement,
  onClearAll,
}: PendantsCatalogSectionProps) => {
  const { drag, start, move, cancel } = useSidebarDragDrop<string, number>({
    computeTarget: computeCol,
    onHoverChange: onHoveredColChange,
    onDrop: onAddPlacement,
  });

  const dragTemplate = drag
    ? templates.find((t) => t.id === drag.payload) ?? null
    : null;

  const hasPendants = placements.length > 0;

  return (
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
                start(e, template.id);
              }}
              onPointerMove={move}
              onPointerUp={cancel}
              onPointerCancel={cancel}
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

      {drag && dragTemplate && createPortal(
        <div
          className="pendant-drag-ghost"
          style={{ left: drag.x, top: drag.y }}
        >
          <PendantPreview template={dragTemplate} />
        </div>,
        document.body,
      )}
    </section>
  );
};
