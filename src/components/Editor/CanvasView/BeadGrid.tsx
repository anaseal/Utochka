/* FILE: src\components\Editor\CanvasView\BeadGrid.tsx */
import { memo } from 'react';
import { Bead } from '../../../types/bead';
import { BeadView } from '../BeadView/BeadView';
import { CanvasRulers } from '../CanvasRulers/CanvasRulers';
import { defaultColorFor } from '../../../config/theme';

interface BeadGridProps {
  beads: Bead[];
  // Удалённые инструментом Hole бисерины — рисуются пунктирным «призраком»,
  // пустой массив, когда инструмент неактивен (см. CanvasView).
  ghostBeads: Bead[];
  onGhostPointerDown: (id: string) => void;
  // Предпросмотр сегмента (нода + все её грани) под наведённой нодой, пока
  // активен инструмент «Hole segment» — красное кольцо вместо обычного
  // highlighted, см. BeadView.
  deletePreviewIds: Set<string> | null;
  // Бисерины, помеченные на удаление (Bead/Segment), но ещё не удалённые —
  // ждут подтверждения (HolesSection). Рисуются пунктиром прямо на месте
  // (bead ещё есть в beads, в отличие от ghostBeads ниже), см. BeadView.
  pendingDeleteIds: Set<string> | null;
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
// Призраки не участвуют в протяжке — стабильный no-op вместо onPointerEnter,
// чтобы не заводить лишний проп ради инструмента, который умеет только клик.
const noopPointerEnter = () => {};

export const BeadGrid = memo(({
  beads,
  ghostBeads,
  onGhostPointerDown,
  deletePreviewIds,
  pendingDeleteIds,
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
          deletePreview={deletePreviewIds?.has(bead.id) ?? false}
          pendingDelete={pendingDeleteIds?.has(bead.id) ?? false}
          onPointerEnter={onPointerEnter}
          onPointerDown={onPointerDown}
        />
      ))}

      {ghostBeads.map((bead) => (
        <BeadView
          key={`ghost:${bead.id}`}
          id={bead.id}
          x={bead.x}
          y={bead.y}
          type={bead.type}
          defaultColor={defaultColorFor(bead.type)}
          deleted
          onPointerEnter={noopPointerEnter}
          onPointerDown={onGhostPointerDown}
        />
      ))}
    </>
  );
});

BeadGrid.displayName = 'BeadGrid';
