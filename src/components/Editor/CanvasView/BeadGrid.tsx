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
  hoveredRow: number | null;
  mirrorMode: boolean;
  width: number;
  bottomEdgeEnabled: boolean;
  bottomEdgeSpan: number;
  onBottomEdgeSpanChange: (delta: number) => void;
  spanControlsExpanded: boolean;
  gutterShiftX: number;
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
  hoveredRow,
  mirrorMode,
  width,
  bottomEdgeEnabled,
  bottomEdgeSpan,
  onBottomEdgeSpanChange,
  spanControlsExpanded,
  gutterShiftX,
}: BeadGridProps) => {
  return (
    <>
      <CanvasRulers
        beads={beads}
        topSpan={topSpan}
        bottomSpan={bottomSpan}
        rowSpanOverrides={rowSpanOverrides}
        onRowSpanChange={onRowSpanChange}
        hoveredRow={hoveredRow}
        mirrorMode={mirrorMode}
        width={width}
        bottomEdgeEnabled={bottomEdgeEnabled}
        bottomEdgeSpan={bottomEdgeSpan}
        onBottomEdgeSpanChange={onBottomEdgeSpanChange}
        spanControlsExpanded={spanControlsExpanded}
        gutterShiftX={gutterShiftX}
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
