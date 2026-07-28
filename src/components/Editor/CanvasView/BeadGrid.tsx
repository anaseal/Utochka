/* FILE: src\components\Editor\CanvasView\BeadGrid.tsx */
import { memo } from 'react';
import { Bead } from '../../../types/bead';
import { BeadView } from '../BeadView/BeadView';
import { CanvasRulers } from '../CanvasRulers/CanvasRulers';
import { defaultColorFor } from '../../../config/theme';

interface BeadGridProps {
  beads: Bead[];
  designMap: Record<string, string>;
  highlightedNodeIds: Set<string> | null;
  colorHighlightedBeadIds: Set<string> | null;
  chainPendingId: string | null;
  stampPreviewPatch: Record<string, string> | null;
  onPointerEnter: (id: string) => void;
  onPointerDown: (id: string) => void;
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  onRowSpanChange: (spanRowIndex: number, delta: number) => void;
  width: number;
  topEdgeEnabled: boolean;
  bottomEdgeEnabled: boolean;
  spanControlsExpanded: boolean;
  gutterShiftX: number;
  labelTransform?: (x: number, y: number) => string | undefined;
}

// Вынесено из CanvasView и обёрнуто в memo: колонка (hoveredCol), которую
// таскает PendantsSidebar при перетаскивании подвески/ленты, обновляется на
// каждый кадр pointermove, но сама сетка бисерин от неё не зависит — без
// этого разделения React пересобирал бы JSX для всех бисерин на каждый такой
// апдейт, что и вызывало лаги при драге (см. PendantsSidebar.tsx).
export const BeadGrid = memo(({
  beads,
  designMap,
  highlightedNodeIds,
  colorHighlightedBeadIds,
  chainPendingId,
  stampPreviewPatch,
  onPointerEnter,
  onPointerDown,
  topSpan,
  bottomSpan,
  rowSpanOverrides,
  onRowSpanChange,
  width,
  topEdgeEnabled,
  bottomEdgeEnabled,
  spanControlsExpanded,
  gutterShiftX,
  labelTransform,
}: BeadGridProps) => {
  return (
    <>
      <CanvasRulers
        beads={beads}
        topSpan={topSpan}
        bottomSpan={bottomSpan}
        rowSpanOverrides={rowSpanOverrides}
        onRowSpanChange={onRowSpanChange}
        width={width}
        topEdgeEnabled={topEdgeEnabled}
        bottomEdgeEnabled={bottomEdgeEnabled}
        spanControlsExpanded={spanControlsExpanded}
        gutterShiftX={gutterShiftX}
        labelTransform={labelTransform}
      />

      {beads.map((bead) => (
        <BeadView
          key={bead.id}
          id={bead.id}
          x={bead.x}
          y={bead.y}
          type={bead.type}
          color={designMap[bead.id]}
          defaultColor={defaultColorFor(bead.type)}
          highlighted={
            (highlightedNodeIds?.has(bead.id) ?? false) ||
            (colorHighlightedBeadIds?.has(bead.id) ?? false) ||
            bead.id === chainPendingId
          }
          previewColor={stampPreviewPatch?.[bead.id]}
          onPointerEnter={onPointerEnter}
          onPointerDown={onPointerDown}
        />
      ))}
    </>
  );
});

BeadGrid.displayName = 'BeadGrid';
