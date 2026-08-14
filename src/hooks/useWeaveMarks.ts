import { RefObject, useCallback, useEffect, useRef } from 'react';
import { WeavePasses } from './useWeaveProgress';

// Приглушение проплетённых бисерин ставится классом прямо в DOM, минуя React —
// тот же приём, что уже используется для покраски бисерин во время протяжки
// (applyBeadColorDom в CanvasView.tsx). Причина та же: сетка сидит под memo
// (BeadGrid.tsx), и прокинуть в неё прогресс пропом значило бы пересобирать
// список из тысяч бисерин на каждую отметку.
//
// Метки повторных проходов рисуются отдельным лёгким слоем (WeaveLayer) —
// их всегда немного, там обычный React.

const WOVEN_CLASS = 'bead--woven';

export const useWeaveMarks = (
  svgRef: RefObject<SVGSVGElement | null>,
  passes: WeavePasses,
  active: boolean,
  // Только как признак «сетка пересобралась» — после этого элементы новые и
  // классов на них нет. Форма бисерины тут не важна, поэтому тип общий для
  // всех четырёх техник.
  beads: readonly { id: string }[],
) => {
  // Кому класс уже проставлен — чтобы снимать его точечно, а не искать по
  // всему документу.
  const appliedRef = useRef<Set<string>>(new Set());

  // Полная синхронизация: вход и выход из режима, отмена, сброс, а также
  // перегенерация сетки (beads) — после неё элементы новые и классов на них нет.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const doc = svg.ownerDocument;
    const next = active ? new Set(Object.keys(passes)) : new Set<string>();

    for (const id of appliedRef.current) {
      if (!next.has(id)) doc.getElementById(id)?.classList.remove(WOVEN_CLASS);
    }
    for (const id of next) {
      doc.getElementById(id)?.classList.add(WOVEN_CLASS);
    }
    appliedRef.current = next;
  }, [svgRef, passes, active, beads]);

  // Живая отметка во время мазка: применяется сразу, не дожидаясь коммита
  // прогресса в state (см. useWeaveProgress — endStroke).
  const applyMarksDom = useCallback((changes: [string, number][]) => {
    const svg = svgRef.current;
    if (!svg) return;
    const doc = svg.ownerDocument;
    for (const [id, count] of changes) {
      const el = doc.getElementById(id);
      if (count > 0) {
        el?.classList.add(WOVEN_CLASS);
        appliedRef.current.add(id);
      } else {
        el?.classList.remove(WOVEN_CLASS);
        appliedRef.current.delete(id);
      }
    }
  }, [svgRef]);

  return applyMarksDom;
};
