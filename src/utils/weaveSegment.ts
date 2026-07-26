// Сегмент — единица отметки в режиме плетения: то, что отмечается одним
// кликом как «сплетено». Режим НЕ знает порядок плетения (схем много, см.
// spec.md, «Режим плетения») — он лишь умеет собрать логическую группу
// бисерин вокруг той, по которой попали.
//
// У силянки группы задаются структурой ID (см. beadId.ts): весь пролёт грани,
// вся верхняя/нижняя кромка между парой узлов, весь столбик декор-полосы в
// своей колонке, либо отдельный узел. Бисерина пролёта принадлежит ровно
// одному пролёту, поэтому клик однозначен.
//
// У крестика пролётов нет — там сегмент это ячейка-крестик из четырёх бисерин
// (левая, верхняя, нижняя, правая). Одна бисерина входит сразу в две соседние
// ячейки; берётся та, где бисерина левая/верхняя (crossWeaveCellOf).

import { Bead } from '../types/bead';
import { decode } from './beadId';

/**
 * Ключ группы, к которой принадлежит бисерина силянки. Бисерины с одинаковым
 * ключом отмечаются вместе.
 */
export const silyankaSegmentKey = (id: string): string | null => {
  const ref = decode(id);
  if (!ref) return null;
  switch (ref.kind) {
    case 'node':
      return `node:${ref.r}:${ref.c}`;
    case 'vertEdge':
      return `vertEdge:${ref.r}:${ref.c}:${ref.side}`;
    case 'topLink':
      return `topLink:${ref.c}`;
    case 'bottomLink':
      return `bottomLink:${ref.c}`;
    // Столбик декор-полосы: все ряды полосы в одной колонке. Нить проходит
    // его целиком между узлом и гранью (см. spec.md, «Режим плетения»),
    // поэтому ключ не включает k.
    case 'decor':
      return `decor:${ref.r}:${ref.c}`;
  }
};

export type SegmentIndex = Map<string, string[]>;

/**
 * Индекс «ключ группы → ID её бисерин». Строится один раз на текущую сетку,
 * чтобы клик и протяжка не перебирали весь массив бисерин каждый раз.
 */
export const buildSegmentIndex = (beads: Bead[]): SegmentIndex => {
  const index: SegmentIndex = new Map();
  for (const bead of beads) {
    const key = silyankaSegmentKey(bead.id);
    if (key === null) continue;
    const group = index.get(key);
    if (group) group.push(bead.id);
    else index.set(key, [bead.id]);
  }
  return index;
};

/**
 * Все бисерины группы, которой принадлежит `id` (пролёт/кромка/декор-столбик).
 * Бисерина неизвестного вида (или отсутствующая в индексе) остаётся сама по
 * себе — отметить её по-прежнему можно, просто в одиночку.
 */
export const silyankaSegment = (id: string, index: SegmentIndex): string[] => {
  const key = silyankaSegmentKey(id);
  if (key === null) return [id];
  return index.get(key) ?? [id];
};

export type WeaveSide = 'left' | 'right';

export const flipSide = (side: WeaveSide): WeaveSide => (side === 'left' ? 'right' : 'left');

/**
 * Узлы-концы пролёта вертикальной грани: верхний — (r, c), из которого грань
 * выходит вниз, нижний — куда она приходит (топология generator.ts: чётный r —
 * left→(r+1, c-1), right→(r+1, c); нечётный — left→(r+1, c), right→(r+1, c+1)).
 */
export const vertEdgeEndNodes = (r: number, c: number, side: WeaveSide) => ({
  top: { r, c },
  bottom: {
    r: r + 1,
    c: r % 2 === 0 ? (side === 'left' ? c - 1 : c) : (side === 'left' ? c : c + 1),
  },
});

/**
 * Сторона сетки, которой проход цепляется за уже сплетённое. Плетение идёт
 * слева направо ПО ЭКРАНУ (см. разметку шагов в spec.md — все одиночные шаги
 * берут левую пару граней), поэтому на отражённом полотне (Flip) экранное
 * «слева» — это правая сторона сетки. Отражением и пользуются, когда плетут
 * справа налево, — отдельного режима направления нет.
 */
export const weavingSide = (mirrored: boolean): WeaveSide => (mirrored ? 'right' : 'left');

/** Грань, входящая в узел (r, c) сверху с указанной стороны (топология generator.ts). */
const upperEdgeOf = (r: number, c: number, side: WeaveSide) => (side === 'left'
  ? (r % 2 === 0 ? { r: r - 1, c: c - 1 } : { r: r - 1, c })
  : (r % 2 === 0 ? { r: r - 1, c } : { r: r - 1, c: c + 1 }));

/**
 * Главный сегмент режима плетения — один проход нити от узла до узла:
 * «узел → грань → узел → грань → узел» (см. разметку шагов в spec.md, шаг 6:
 * node-1-0 → плечо (1,0)-right → node-2-1 → ножка (2,1)-left → node-3-0).
 * Центр (r, c) — узел, сквозь который нить проходит; обе его грани берутся по
 * одну сторону, и вместе с ними отмечаются их дальние узлы.
 *
 * У ряда 0 диагональной грани сверху нет — её место в проходе занимает пролёт
 * верхней цепочки той же стороны (шаг 5 разметки: node-0-0 → top-link-0 →
 * node-0-1 → ножка (0,1)-left → node-1-0).
 *
 * Ключи граней — прямо из generator.ts. Нижние грани узла (r,c): `left`/`right`
 * самого узла (геометрически side в ID совпадает с лево/право). Верхние —
 * приходящие из ряда r-1: при чётном r это (r-1, c-1) right [левая] и
 * (r-1, c) left [правая]; при нечётном r — (r-1, c) right [левая] и
 * (r-1, c+1) left [правая].
 */
export const silyankaNodeSegment = (
  r: number,
  c: number,
  side: WeaveSide,
  index: SegmentIndex,
): string[] => {
  const ids: string[] = [];
  const push = (key: string) => {
    const group = index.get(key);
    if (group) ids.push(...group);
  };

  // Верхнее звено прохода + его дальний узел. Дальний узел без своей грани не
  // отмечается: нити не по чему до него дойти (срез Taper, край полотна).
  if (r === 0) {
    const spanC = side === 'left' ? c - 1 : c;
    if (index.has(`topLink:${spanC}`)) {
      push(`topLink:${spanC}`);
      push(`node:0:${side === 'left' ? c - 1 : c + 1}`);
    }
  } else {
    const upper = upperEdgeOf(r, c, side);
    const upperKey = `vertEdge:${upper.r}:${upper.c}:${flipSide(side)}`;
    if (index.has(upperKey)) {
      push(upperKey);
      push(`node:${upper.r}:${upper.c}`);
    }
  }

  push(`node:${r}:${c}`);

  // Нижнее звено прохода + его дальний узел.
  const lowerKey = `vertEdge:${r}:${c}:${side}`;
  if (index.has(lowerKey)) {
    push(lowerKey);
    const far = vertEdgeEndNodes(r, c, side).bottom;
    push(`node:${far.r}:${far.c}`);
  }

  return ids;
};

export interface WeavePassOptions {
  /** Полотно отражено (Flip) — экранное «слева направо» смотрит в другую сторону сетки. */
  mirrored?: boolean;
  /** Нижний ряд узлов: там проход разворачивается. */
  bottomRow?: number;
}

/**
 * Сегмент клика по узлу. Сторона не выбирается жестом и не зависит от места
 * клика — она выводится из сетки (`weavingSide`): проход нового столбика
 * всегда цепляется парой граней с той стороны, откуда пришло плетение. У
 * крайних узлов этой пары нет вовсе — их проход идёт другой стороной (старт
 * полотна, шаг 1 разметки: node-1--1). Узел нижнего ряда — разворот: обе
 * верхние грани с их дальними узлами (шаг 1: node-8-0, шаг 9: node-8-1);
 * нижняя цепочка в разворот не входит — её пролёты отмечаются кликами по ним
 * самим (разметки для неё нет).
 */
export const silyankaNodeClickSegment = (
  r: number,
  c: number,
  index: SegmentIndex,
  { mirrored = false, bottomRow }: WeavePassOptions = {},
): string[] => {
  if (bottomRow !== undefined && r === bottomRow && r > 0) {
    return Array.from(new Set([
      ...silyankaNodeSegment(r, c, 'left', index),
      ...silyankaNodeSegment(r, c, 'right', index),
    ]));
  }
  const side = weavingSide(mirrored);
  const primary = silyankaNodeSegment(r, c, side, index);
  if (primary.length > 1) return primary;
  return silyankaNodeSegment(r, c, flipSide(side), index);
};

/**
 * Узел-центр прохода, которому принадлежит бисерина грани или кромки — чтобы
 * клик по спану отмечал весь сегмент «спан-нода-спан», а не один пролёт.
 *
 * Раз сторона прохода фиксирована, каждый пролёт входит РОВНО в один проход, и
 * клик однозначен: при плетении левой стороной грань `left` — это нижняя грань
 * своего узла (r, c), а грань `right` — верхняя грань узла ряда r+1; пролёт
 * верхней цепочки — верхнее звено прохода правого из двух своих узлов. При
 * отражённом полотне стороны меняются местами.
 */
export const silyankaPassCenter = (
  id: string,
  mirrored = false,
): { r: number; c: number } | null => {
  const ref = decode(id);
  if (!ref) return null;
  const side = weavingSide(mirrored);

  if (ref.kind === 'vertEdge') {
    // Грань со стороны плетения — нижняя грань своего же узла.
    if (ref.side === side) return { r: ref.r, c: ref.c };
    // Иначе это верхняя грань узла из ряда ниже — обращение upperEdgeOf.
    const r = ref.r + 1;
    const c = side === 'left'
      ? (r % 2 === 0 ? ref.c + 1 : ref.c)
      : (r % 2 === 0 ? ref.c : ref.c - 1);
    return { r, c };
  }
  if (ref.kind === 'topLink') {
    return { r: 0, c: side === 'left' ? ref.c + 1 : ref.c };
  }
  return null;
};

/** Четыре бисерины ячейки `(r, c)` при нечётном `r`, или `null`, если полной ячейки нет. */
const crossWeaveCell = (
  r: number,
  c: number,
  beadIds: ReadonlySet<string>,
): string[] | null => {
  const ids = [
    `bead-${r}-${c}`,
    `bead-${r - 1}-${c}`,
    `bead-${r + 1}-${c}`,
    `bead-${r}-${c + 1}`,
  ];
  return ids.every((id) => beadIds.has(id)) ? ids : null;
};

/**
 * Ячейка-крестик бисерины: `bead-r-c` слева, `bead-{r-1}-c` сверху,
 * `bead-{r+1}-c` снизу, `bead-r-{c+1}` справа (при нечётном `r`).
 *
 * Каждая бисерина входит ровно в две ячейки: горизонтальная (нечётный `r`) —
 * в ячейку слева от себя (там она правая) и справа (там левая), вертикальная
 * (чётный `r`) — в ячейку сверху (там нижняя) и снизу (там верхняя).
 *
 * Берётся та, которую бисерина ЗАМЫКАЕТ: где она правая или нижняя. По
 * разметке шагов плетения (см. spec.md) новые бисерины шага — это правая,
 * нижняя и иногда верхняя, а левая почти всегда набрана на прошлом шаге;
 * то есть кликают по той бисерине, которой крестик закончили. Обратное
 * правило (крестик ниже/правее) при повороте плетения вниз промахивалось на
 * колонку вправо.
 *
 * Если замкнутой ячейки нет (край) или в ней уже всё отмечено — берётся
 * вторая: иначе клик по левой/верхней бисерине уводил бы в соседний,
 * давно сплетённый крестик, где отмечать нечего.
 *
 * От координат точки клика выбор не зависит вовсе: хитбокс бисерины больше
 * её самой и торчит за пределы своего ряда, поэтому округление точки до
 * ближайшего ряда промахивалось мимо сетки — у верхнего ряда клик выше центра
 * давал несуществующий ряд -1, и вместо крестика отмечалась одна бисерина.
 *
 * `null` — только когда полной ячейки нет ни с одной стороны (угол полотна).
 */
export const crossWeaveCellOf = (
  beadId: string,
  beadIds: ReadonlySet<string>,
  isMarked: (id: string) => boolean = () => false,
): string[] | null => {
  const match = /^bead-(\d+)-(\d+)$/.exec(beadId);
  if (!match) return null;
  const r = Number(match[1]);
  const c = Number(match[2]);

  const cells: [number, number][] = r % 2 === 1
    ? [[r, c - 1], [r, c]]
    : [[r - 1, c], [r + 1, c]];

  const complete = cells
    .map(([cellR, cellC]) => crossWeaveCell(cellR, cellC, beadIds))
    .filter((cell): cell is string[] => cell !== null);
  if (complete.length === 0) return null;

  return complete.find((cell) => cell.some((id) => !isMarked(id))) ?? complete[0];
};
