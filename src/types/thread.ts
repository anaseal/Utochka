export interface Thread {
  id: string;
  /** Упорядоченный путь через id бусин (сетка/подвеска/цепочка-подвеска — любые), ≥2 */
  beadIds: string[];
  /**
   * Только для crossWeave: крестик физически плетётся двумя нитками одновременно
   * (силянка — одной), поэтому там нитка помечается, какой из двух она
   * соответствует — влияет только на цвет (см. ThreadLayer). У силянки не
   * используется (всегда undefined).
   */
  strand?: 1 | 2;
  /**
   * Цвет/прозрачность, выбранные пользователем для ЭТОЙ конкретной нити в
   * момент коммита (попап у кнопки инструмента «Нитка», см. Header.tsx) —
   * выставляются только вместе. undefined у обоих (цвет для нити не задавали) —
   * цвет берётся из strand/дефолта CSS
   * (см. threadColorStyle, utils/threadStyle.ts). Перепрокладка конца
   * (rerouteThreadEnd) их не меняет.
   */
  color?: string;
  opacity?: number;
}

/** id бусины-якоря нужного конца нитки (см. beginThreadReroute/ручки в ThreadLayer). */
export const threadEndBeadId = (thread: Thread, end: 'start' | 'end'): string =>
  end === 'start' ? thread.beadIds[0] : thread.beadIds[thread.beadIds.length - 1];

/**
 * Незавершённая трассировка нитки — либо новая нитка (rerouting: null), либо
 * перепрокладка одного конца существующей (см. useThreadTrace).
 */
export interface ThreadTrace {
  beadIds: string[];
  rerouting: { threadId: string; end: 'start' | 'end' } | null;
}

/**
 * Живой курсор во время протяжки нитки: resolved-позиция (примагниченная к
 * ближайшей бусине в пределах hitboxRadius, иначе — сырые координаты курсора)
 * + id бусины-магнита, если попали в радиус. Используется и для «резиновой»
 * линии за курсором, и для решения, показывать ли крестик отмены последней
 * точки (см. ThreadLayer).
 */
export interface ThreadLiveCursor {
  pos: { x: number; y: number };
  magnetId: string | null;
}

/**
 * Опции коммита нитки (см. useThreads.addThread). strand — только у крестика
 * (силянка плетётся одной ниткой), color/opacity — «кисть» из хедера.
 */
export interface ThreadCommitOptions {
  strand?: 1 | 2;
  color?: string;
  opacity?: number;
}
