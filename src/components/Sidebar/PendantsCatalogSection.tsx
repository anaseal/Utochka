import { createPortal } from 'react-dom';
import { RotateCcw } from 'lucide-react';
import { PendantAnchor, PendantPlacement, PendantTemplate } from '../../types/pendant';
import { SectionHelp } from '../common/SectionHelp';
import { IconButton } from '../common/IconButton';
import { PendantPreview } from './PendantPreviews';
import { useSidebarDragDrop } from '../../hooks/useSidebarDragDrop';

interface PendantsCatalogSectionProps {
  templates: PendantTemplate[];
  placements: PendantPlacement[];
  bottomEdgeEnabled: boolean;
  computeAnchor: (clientX: number, clientY: number) => PendantAnchor | null;
  onHoveredAnchorChange: (anchor: PendantAnchor | null) => void;
  onAddPlacement: (templateId: string, anchor: PendantAnchor) => void;
  onClearAll: () => void;
}

export const PendantsCatalogSection = ({
  templates,
  placements,
  bottomEdgeEnabled,
  computeAnchor,
  onHoveredAnchorChange,
  onAddPlacement,
  onClearAll,
}: PendantsCatalogSectionProps) => {
  const { drag, start, move, cancel } = useSidebarDragDrop<string, PendantAnchor>({
    computeTarget: computeAnchor,
    onHoverChange: onHoveredAnchorChange,
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
            <SectionHelp text="A pendant hangs from a single node of the bottom row. Where a tooth covers the columns, the bottom row does not run under it — there the pendant hangs from an edge node of the tooth itself." />
          </span>
          <IconButton
            size="sm"
            shape="square"
            variant="ghost"
            onClick={onClearAll}
            disabled={!hasPendants}
            aria-label="Clear Pendants"
            title="Clear Pendants"
            icon={<RotateCcw size={13} />}
          />
        </div>
        {/* Способ взаимодействия — постоянной строкой в потоке, как у секций с
            кнопкой-инструментом: карточка не выглядит перетаскиваемой сама по
            себе, а «?» открывается по клику и до него ещё надо додуматься. */}
        <p className="sidebar__section-desc">
          Drag a card onto a bottom-row node or a tooth edge
        </p>
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

      {/* Причина погашенных карточек стоит рядом с ними: подвески и Bottom
          Chain занимают один и тот же нижний ряд. Обратная половина пары —
          подсказка у тумблера Bottom Chain на вкладке Grid. */}
      {bottomEdgeEnabled && (
        <p className="sidebar__hint">
          Turn off Bottom Chain (Grid tab) to place pendants.
        </p>
      )}

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
