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
//
// Второй, независимый потребитель топологии этого файла — инструмент «Hole
// segment» (GridSidebar, «Holes»): в отличие от плетения ему нужны ВСЕ грани
// узла сразу (оба направления, обе стороны), а не одна сторона одного прохода
// — см. silyankaNodeSpans ниже.

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
export const upperEdgeOf = (r: number, c: number, side: WeaveSide) => (side === 'left'
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

/**
 * Все пролёты, физически сходящиеся к узлу (r, c) — обе исходящие грани
 * (вниз, свои же `vertEdge:{r}:{c}:left/right`), обе входящие грани (сверху,
 * через `upperEdgeOf`), соседняя top/bottom-кромка и декор-колонка, если
 * узел их анкер. Единица удаления инструмента «Hole segment» (GridSidebar,
 * «Holes»): в отличие от `silyankaNodeSegment` (одна сторона одного прохода
 * нити) здесь нужно СРАЗУ всё, что от узла физически зависит — удаление узла
 * обязано снять все его грани, а не одну.
 *
 * `topLink`/`bottomLink` не индексированы по ряду (сам id их не хранит — см.
 * beadId.ts, генератор создаёт их только при r=0 / r=bottomRow
 * соответственно), поэтому ключ `topLink:5` однозначен только если сам узел
 * реально лежит в этом ряду — иначе можно случайно утащить чужую кромку
 * верхнего/нижнего края в удаление узла из середины полотна той же колонки.
 * `bottomRow` явно передаётся вызывающей стороной (в отличие от
 * `silyankaNodeClickSegment`, где режим плетения сам ищет нижний ряд сканом
 * `beads` за неимением `gridSize` под рукой) — у `useSilyankaProject.ts` уже
 * есть точный источник истины, `2 * gridSize.height`.
 *
 * Группы структурно не пересекаются (та же гарантия, что у silyankaSegment),
 * поэтому дедуп не нужен.
 */
export const silyankaNodeSpans = (
  r: number,
  c: number,
  index: SegmentIndex,
  { bottomRow }: { bottomRow?: number } = {},
): string[] => {
  const ids: string[] = [];
  const push = (key: string) => {
    const group = index.get(key);
    if (group) ids.push(...group);
  };

  push(`vertEdge:${r}:${c}:left`);
  push(`vertEdge:${r}:${c}:right`);

  (['left', 'right'] as const).forEach((side) => {
    const upper = upperEdgeOf(r, c, side);
    push(`vertEdge:${upper.r}:${upper.c}:${flipSide(side)}`);
  });

  if (r === 0) {
    push(`topLink:${c - 1}`);
    push(`topLink:${c}`);
  }
  if (bottomRow !== undefined && r === bottomRow) {
    push(`bottomLink:${c - 1}`);
    push(`bottomLink:${c}`);
  }

  push(`decor:${r}:${c}`);

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
 * полотна, шаг 1 разметки: node-1--1).
 *
 * Узел нижнего ряда (зубец полотна без нижней цепочки) — разворот: сторона
 * `weavingSide` (откуда пришло плетение) — просто закрывающий стежок, её
 * дальний узел уже был началом соседнего прохода, поэтому она остаётся
 * усечённой на 1 звено, как и раньше (шаг 1: node-8-0). Противоположная
 * сторона — это НЕ второе звено того же разворота, а начало следующего
 * прохода вверх (шаг 9: node-8-1 в разметке), поэтому берётся не усечённая
 * пара граней самого нижнего узла, а полный проход её дальнего узла той же
 * `weavingSide` — ровно то же самое, что дал бы обычный клик по этому
 * дальнему узлу. Если дальше по сетке нечему продолжаться, оба варианта
 * совпадают (см. тест «шаг 1»).
 *
 * Узел ровно НАД зубцом (его нижняя грань ведёт в bottomRow) — не отдельный
 * проход сам по себе, а «начало следующего прохода вверх» ЧУЖОГО разворота
 * (см. выше): клик по нему или по любой его грани обязан подсветить тот же
 * объединённый сегмент, что и клик по самому зубцу, иначе один и тот же
 * физический стежок подсвечивается по-разному в зависимости от того, по
 * какой бисерине попали. Поэтому раньше, чем строить свой обычный проход,
 * проверяем: не ведёт ли этот узел прямиком в bottomRow — и если да,
 * отдаём управление развороту.
 */
export const silyankaNodeClickSegment = (
  r: number,
  c: number,
  index: SegmentIndex,
  { mirrored = false, bottomRow }: WeavePassOptions = {},
): string[] => {
  if (bottomRow !== undefined && r === bottomRow && r > 0) {
    const side = weavingSide(mirrored);
    const other = flipSide(side);
    const closing = silyankaNodeSegment(r, c, side, index);
    const upper = upperEdgeOf(r, c, other);
    const rising = silyankaNodeSegment(upper.r, upper.c, side, index);
    return Array.from(new Set([...closing, ...rising]));
  }

  // Узел стоит ровно над зубцом с этой стороны — сам не разворот, но его
  // дальний узел (через уже существующую грань `passSide`) им является.
  const redirectToBottom = (passSide: WeaveSide): string[] | null => {
    if (bottomRow === undefined || !index.has(`vertEdge:${r}:${c}:${passSide}`)) return null;
    const far = vertEdgeEndNodes(r, c, passSide).bottom;
    if (far.r !== bottomRow) return null;
    return silyankaNodeClickSegment(bottomRow, far.c, index, { mirrored, bottomRow });
  };

  const side = weavingSide(mirrored);
  const redirected = redirectToBottom(side);
  if (redirected) return redirected;

  const primary = silyankaNodeSegment(r, c, side, index);
  if (primary.length > 1) return primary;

  return redirectToBottom(flipSide(side)) ?? silyankaNodeSegment(r, c, flipSide(side), index);
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

/**
 * Сегмент Loom: весь ряд, которому принадлежит `beadId`. В станочном
 * плетении один проход утка набирает и протягивает ровно один ряд бисерин
 * целиком — в отличие от силянки/крестика, где нить идёт зигзагом или
 * крестами, здесь сегмент однозначен без всякой геометрии соседства.
 *
 * `null` — только если id не распознан (не бисерина Loom).
 */
export const loomRowSegment = (beadId: string, width: number): string[] | null => {
  const match = /^loom-(\d+)-\d+$/.exec(beadId);
  if (!match) return null;
  const r = Number(match[1]);
  return Array.from({ length: width }, (_, c) => `loom-${r}-${c}`);
};

/**
 * Сегмент Peyote: вся колонка, которой принадлежит `beadId` — не ряд, как у
 * Loom. Типовая раскладка схемы пейота (особенно для узких длинных изделий
 * вроде браслета) кладёт длину изделия по горизонтали, а её узкую ширину —
 * по вертикали (см. spec.md, «Peyote» → «Режим плетения»); один физический
 * проход нити идёт поперёк этой узкой ширины, то есть визуально сверху вниз
 * одной колонкой, а не слева направо рядом, как проход утка на станке.
 *
 * `null` — только если id не распознан (не бисерина Peyote).
 */
export const peyoteColumnSegment = (beadId: string, height: number): string[] | null => {
  const match = /^peyote-\d+-(\d+)$/.exec(beadId);
  if (!match) return null;
  const c = Number(match[1]);
  return Array.from({ length: height }, (_, r) => `peyote-${r}-${c}`);
};
