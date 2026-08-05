import { useCallback, useMemo, useRef, useState } from 'react';
import { usePersistedState } from './usePersistedState';

// Прогресс плетения: сколько раз нить прошла через каждую бисерину.
// Не последовательность шагов и не номер ряда — режим не знает, в каком
// порядке плетут (схем плетения много, см. spec.md, «Режим плетения»), он лишь
// хранит отметки, которые ставит сама мастерица. Повторные проходы считаются
// отдельно и видны на холсте: по ним читается направление плетения.
//
// История отмен своя, отдельно от Undo/Redo рисунка (useDrawing): отменить
// отметку и отменить мазок карандашом — разные действия, мешать их в одной
// истории нельзя. Redo здесь нет сознательно — отметка прогресса ставится
// заново одним кликом.
//
// Устройство мазка повторяет useDrawing: снимок делается один раз в начале
// (beginStroke), изменения копятся в ref и отдаются вызывающей стороне для
// прямой записи в DOM, а в state коммитятся один раз в конце (endStroke) —
// иначе протяжка пересобирала бы сетку из тысяч бисерин на каждое движение
// пальца и забивала бы историю по одной бисерине.

export type WeavePasses = Record<string, number>;

export type WeaveMark = 'mark' | 'unmark' | 'clear';

const MAX_HISTORY = 30;

const isWeavePasses = (v: unknown): v is WeavePasses =>
  typeof v === 'object' && v !== null &&
  Object.values(v as Record<string, unknown>).every((n) => typeof n === 'number' && n > 0);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string');

export const useWeaveProgress = (technique: 'silyanka' | 'crossWeave' | 'peyote' | 'loom') => {
  const [passes, setPasses] = usePersistedState<WeavePasses>(
    `${technique}:weavePasses`, {}, isWeavePasses,
  );
  // Последний отмеченный сегмент — по нему работает кнопка «где я остановилась»
  // и подсветка места на холсте, когда возвращаешься к работе после перерыва.
  const [lastSegment, setLastSegment] = usePersistedState<string[]>(
    `${technique}:weaveLastSegment`, [], isStringArray,
  );
  const [past, setPast] = useState<{ passes: WeavePasses; lastSegment: string[] }[]>([]);

  const passesRef = useRef(passes);
  passesRef.current = passes;
  const lastSegmentRef = useRef(lastSegment);
  lastSegmentRef.current = lastSegment;

  // Итоговое число проходов по каждой задетой мазком бисерине (0 = снять).
  const strokeRef = useRef<Map<string, number>>(new Map());
  const preStrokeRef = useRef<{ passes: WeavePasses; lastSegment: string[] } | null>(null);
  const strokeLastSegmentRef = useRef<string[] | null>(null);

  const pushSnapshot = useCallback((snapshot: { passes: WeavePasses; lastSegment: string[] }) => {
    setPast((prev) => {
      const next = [...prev, snapshot];
      return next.length > MAX_HISTORY ? next.slice(1) : next;
    });
  }, []);

  const beginStroke = useCallback(() => {
    preStrokeRef.current = { passes: passesRef.current, lastSegment: lastSegmentRef.current };
    strokeRef.current = new Map();
    strokeLastSegmentRef.current = null;
  }, []);

  /**
   * Применяет отметку к бисеринам и возвращает их новое число проходов —
   * вызывающая сторона красит их в DOM, не дожидаясь ререндера.
   * Ничего не коммитит в state: это делает endStroke.
   */
  const applyToBeads = useCallback((ids: string[], mode: WeaveMark): [string, number][] => {
    if (ids.length === 0) return [];
    const stroke = strokeRef.current;
    const result: [string, number][] = [];
    for (const id of ids) {
      const current = stroke.has(id) ? (stroke.get(id) as number) : (passesRef.current[id] ?? 0);
      let next: number;
      if (mode === 'mark') next = current + 1;
      else if (mode === 'unmark') next = Math.max(0, current - 1);
      else next = 0;
      if (next === current) continue;
      stroke.set(id, next);
      result.push([id, next]);
    }
    if (mode === 'mark' && result.length > 0) strokeLastSegmentRef.current = ids;
    return result;
  }, []);

  const endStroke = useCallback(() => {
    const pre = preStrokeRef.current;
    const stroke = strokeRef.current;
    preStrokeRef.current = null;
    if (!pre || stroke.size === 0) return;

    const next = { ...passesRef.current };
    for (const [id, count] of stroke) {
      if (count > 0) next[id] = count;
      else delete next[id];
    }
    strokeRef.current = new Map();

    passesRef.current = next;
    setPasses(next);
    pushSnapshot(pre);

    const marked = strokeLastSegmentRef.current;
    if (marked) {
      lastSegmentRef.current = marked;
      setLastSegment(marked);
    }
  }, [setPasses, setLastSegment, pushSnapshot]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const snapshot = past[past.length - 1];
    passesRef.current = snapshot.passes;
    lastSegmentRef.current = snapshot.lastSegment;
    setPasses(snapshot.passes);
    setLastSegment(snapshot.lastSegment);
    setPast((prev) => prev.slice(0, -1));
  }, [past, setPasses, setLastSegment]);

  const resetAll = useCallback(() => {
    if (Object.keys(passesRef.current).length === 0) return;
    pushSnapshot({ passes: passesRef.current, lastSegment: lastSegmentRef.current });
    passesRef.current = {};
    lastSegmentRef.current = [];
    setPasses({});
    setLastSegment([]);
  }, [setPasses, setLastSegment, pushSnapshot]);

  // useMemo — та же причина, что у drawingControls в useDrawing.ts: объект
  // уходит пропами вниз к холсту, и нестабильная ссылка пробивала бы memo
  // у BeadGrid на любой рендер приложения.
  return useMemo(() => ({
    passes,
    lastSegment,
    beginStroke,
    applyToBeads,
    endStroke,
    undo,
    canUndo: past.length > 0,
    resetAll,
    markedCount: Object.keys(passes).length,
  }), [passes, lastSegment, beginStroke, applyToBeads, endStroke, undo, past.length, resetAll]);
};

export type WeaveProgressControls = ReturnType<typeof useWeaveProgress>;
