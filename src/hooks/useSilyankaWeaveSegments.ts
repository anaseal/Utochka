/* FILE: src\hooks\useSilyankaWeaveSegments.ts */
import { useCallback, useMemo } from 'react';
import { Bead } from '../types/bead';
import { WeaveTool } from '../components/Editor/Header/WeaveControls';
import {
  buildSegmentIndex, silyankaSegment, silyankaNodeClickSegment, silyankaPassCenter,
} from '../utils/weaveSegment';

interface UseSilyankaWeaveSegmentsOptions {
  beads: Bead[];
  weaveTool: WeaveTool;
  weaveFlipped: boolean;
}

// Режим плетения: холст ничего не рисует, клик/протяжка только отмечают, что
// уже сплетено. Резолвер сегмента у силянки и у крестика разный (см. spec.md,
// раздел 4.2 «Общие механики двух холстов») — каждый живёт в своём хуке рядом
// с доменной геометрией своей техники, не унифицируется через useWeaveCanvas.
export const useSilyankaWeaveSegments = ({ beads, weaveTool, weaveFlipped }: UseSilyankaWeaveSegmentsOptions) => {
  const segmentIndex = useMemo(() => buildSegmentIndex(beads), [beads]);
  const beadById = useMemo(() => new Map(beads.map((b) => [b.id, b])), [beads]);
  // Нижний ряд узлов: у его узлов сегмент — разворот из обеих верхних граней
  // (см. silyankaNodeClickSegment).
  const bottomNodeRow = useMemo(() => {
    let max = -Infinity;
    for (const b of beads) {
      if (b.type === 'NODE' && b.logicalIndex.row > max) max = b.logicalIndex.row;
    }
    return max === -Infinity ? undefined : max;
  }, [beads]);

  const weaveBeadsFor = useCallback((id: string): string[] => {
    if (weaveTool !== 'segment') return [id];
    // Сегмент — один проход нити от узла до узла: «узел → грань → узел →
    // грань → узел». Сторона не зависит от жеста и места клика: плетение идёт
    // слева направо по экрану, а на отражённом полотне это другая сторона
    // сетки (см. silyankaNodeClickSegment и разметку шагов в spec.md).
    const pass = { mirrored: weaveFlipped, bottomRow: bottomNodeRow };
    const bead = beadById.get(id);
    if (bead?.type === 'NODE') {
      return silyankaNodeClickSegment(bead.logicalIndex.row, bead.logicalIndex.col, segmentIndex, pass);
    }
    // Клик по спану отмечает тот же сегмент: раз сторона фиксирована, пролёт
    // входит ровно в один проход, и центр однозначен.
    const center = silyankaPassCenter(id, weaveFlipped);
    if (center && segmentIndex.has(`node:${center.r}:${center.c}`)) {
      const ids = silyankaNodeClickSegment(center.r, center.c, segmentIndex, pass);
      // Страховка от края и среза Taper: если проход почему-то не содержит
      // саму кликнутую бисерину, отмечаем её группу, а не чужой сегмент.
      if (ids.includes(id)) return ids;
    }
    return silyankaSegment(id, segmentIndex);
  }, [weaveTool, beadById, segmentIndex, bottomNodeRow, weaveFlipped]);

  return weaveBeadsFor;
};
