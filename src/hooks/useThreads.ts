import { useCallback } from 'react';
import { Thread } from '../types/thread';

type ThreadsApplyPatch = (
  designMapFn: null,
  pendantsFn: null,
  chainsFn: null,
  threadsFn: (t: Thread[]) => Thread[],
) => void;

// Нитка коммитится целиком по двойному клику (магнит-трассировка кликами, см.
// CanvasView/ThreadLayer) — в отличие от usePendants/usePendantChains тут нет
// покрасочной логики (нитка не красится, см. spec.md, «Нитка»), поэтому все
// операции идут через applyPatch, чтобы получить историю Undo/Redo бесплатно,
// вместо своего собственного snapshot-механизма.
export const useThreads = (threads: Thread[], applyPatch: ThreadsApplyPatch) => {
  // strand — только для crossWeave (крестик плетётся двумя нитками
  // одновременно, силянка — одной); силянка вызывает addThread без второго
  // аргумента, тогда поле в объекте не появляется вовсе.
  const addThread = useCallback((beadIds: string[], strand?: 1 | 2) => {
    if (beadIds.length < 2) return;
    applyPatch(null, null, null, (prev) => [
      ...prev,
      { id: crypto.randomUUID(), beadIds, ...(strand !== undefined ? { strand } : {}) },
    ]);
  }, [applyPatch]);

  const removeThread = useCallback((id: string) => {
    applyPatch(null, null, null, (prev) => prev.filter(t => t.id !== id));
  }, [applyPatch]);

  const clearAllThreads = useCallback(() => {
    if (threads.length === 0) return;
    applyPatch(null, null, null, () => []);
  }, [applyPatch, threads.length]);

  // Перепрокладка одного конца нитки: traceBeadIds — новый путь, пройденный
  // магнитом от старого якоря наружу (не включая сам старый якорь). Он
  // заменяет собой отброшенный конец, остальная часть нитки не трогается.
  const rerouteThreadEnd = useCallback((
    threadId: string,
    end: 'start' | 'end',
    traceBeadIds: string[],
  ) => {
    if (traceBeadIds.length === 0) return;
    applyPatch(null, null, null, (prev) => prev.map((t) => {
      if (t.id !== threadId) return t;
      const rest = end === 'start' ? t.beadIds.slice(1) : t.beadIds.slice(0, -1);
      const newSegment = end === 'start' ? [...traceBeadIds].reverse() : traceBeadIds;
      const beadIds = end === 'start' ? [...newSegment, ...rest] : [...rest, ...newSegment];
      return { ...t, beadIds };
    }));
  }, [applyPatch]);

  return { threads, addThread, removeThread, rerouteThreadEnd, clearAllThreads };
};
