import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { WeaveBeadPositions } from '../components/Editor/WeaveLayer/WeaveLayer';
import { WeaveTool } from '../components/Editor/Header/WeaveControls';
import { WeaveProgressControls } from './useWeaveProgress';
import { useWeaveMarks } from './useWeaveMarks';

// Механика режима плетения, общая для обеих техник (см. spec.md, «Режим
// плетения»): мазок отметок и позиции для слоя меток. Холст здесь ничего не
// рисует — только отмечает, что уже сплетено; порядок плетения режим не
// знает и не навязывает. Вид полотна (поворот/отражение) сюда не входит —
// он общий для рисования и режима плетения и живёт в useCanvasView.
//
// Различие техник — только в том, что считать «сегментом»: у силянки это
// проход нити от узла до узла, у крестика — ячейка из четырёх бисерин. Оно
// вынесено в resolveStrokeIds и живёт в своём холсте рядом с остальной
// доменной геометрией.

interface UseWeaveCanvasOptions<B extends { id: string; x: number; y: number }> {
  svgRef: RefObject<SVGSVGElement | null>;
  beads: readonly B[];
  weave: WeaveProgressControls;
  active: boolean;
  tool: WeaveTool;
  /** Радиус метки для этой бисерины — у техник разные размеры бусин. */
  radiusOf: (bead: B) => number;
  /**
   * Какие бисерины отметить кликом/протяжкой по данной. Второй аргумент —
   * уже задетые текущим мазком (нужен крестику, чтобы выбрать, какую из двух
   * соседних ячеек замыкает бисерина, ещё до коммита отметок в state).
   */
  resolveStrokeIds: (beadId: string, strokeSeen: ReadonlySet<string>) => string[];
}

export const useWeaveCanvas = <B extends { id: string; x: number; y: number }>({
  svgRef,
  beads,
  weave,
  active,
  tool,
  radiusOf,
  resolveStrokeIds,
}: UseWeaveCanvasOptions<B>) => {
  const applyMarksDom = useWeaveMarks(svgRef, weave.passes, active, beads);

  const positions = useMemo<WeaveBeadPositions>(() => {
    const map: WeaveBeadPositions = new Map();
    for (const bead of beads) map.set(bead.id, { x: bead.x, y: bead.y, r: radiusOf(bead) });
    return map;
  }, [beads, radiusOf]);

  // Отмечена ли бисерина в текущем мазке — чтобы протяжка через одну и ту же
  // бисерину не накручивала ей проходы на каждое движение пальца.
  const strokeSeenRef = useRef<Set<string>>(new Set());
  // Нажат ли указатель — держим в ref, а не в state: этот флаг читает
  // обработчик наведения, который уходит пропом в сетку под memo, и лишняя
  // смена ссылки пересобирала бы всю сетку на каждое касание.
  const drawingRef = useRef(false);

  const touch = useCallback((beadId: string) => {
    // Проходы честно накапливаются в модели: узлы стыков соседние сегменты
    // делят, и повторный проход по ним — правда нити; на холсте кратность не
    // отображается. Внутри одного мазка бисерина считается один раз.
    const seen = strokeSeenRef.current;
    const ids = resolveStrokeIds(beadId, seen).filter((id) => !seen.has(id));
    if (ids.length === 0) return;
    for (const id of ids) seen.add(id);
    applyMarksDom(weave.applyToBeads(ids, tool === 'erase' ? 'clear' : 'mark'));
  }, [resolveStrokeIds, weave, tool, applyMarksDom]);

  const beginStroke = useCallback(() => {
    strokeSeenRef.current = new Set();
    drawingRef.current = true;
    weave.beginStroke();
  }, [weave]);

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    weave.endStroke();
  }, [weave]);

  /** Наведение при зажатом указателе — продолжение мазка. */
  const touchWhileDrawing = useCallback((beadId: string) => {
    if (drawingRef.current) touch(beadId);
  }, [touch]);

  /** Снятие одного прохода — обратное действие к обычной отметке (правый клик). */
  const unmark = useCallback((ids: string[]) => {
    weave.beginStroke();
    applyMarksDom(weave.applyToBeads(ids, 'unmark'));
    weave.endStroke();
  }, [weave, applyMarksDom]);

  // Выход из режима посреди мазка не должен оставить незакоммиченные отметки.
  useEffect(() => {
    if (!active) endStroke();
  }, [active, endStroke]);

  return {
    positions,
    touch,
    touchWhileDrawing,
    beginStroke,
    endStroke,
    unmark,
  };
};
