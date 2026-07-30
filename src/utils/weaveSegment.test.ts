import { describe, it, expect } from 'vitest';
import { Bead } from '../types/bead';
import {
  silyankaSegmentKey, buildSegmentIndex, silyankaSegment, silyankaNodeSegment,
  silyankaNodeClickSegment, silyankaNodeSpans, silyankaPassCenter, vertEdgeEndNodes,
  upperEdgeOf, crossWeaveCellOf,
} from './weaveSegment';

const bead = (id: string): Bead => ({
  id, x: 0, y: 0, type: id.startsWith('node-') ? 'NODE' : 'SPAN', logicalIndex: { row: 0, col: 0 },
});

describe('silyankaSegmentKey', () => {
  it('узел — сам себе сегмент', () => {
    expect(silyankaSegmentKey('node-2-3')).toBe('node:2:3');
  });

  it('пролёт грани определяется рядом, колонкой и стороной, но не номером бисерины', () => {
    expect(silyankaSegmentKey('span-edge-2-3-left-bead-1'))
      .toBe(silyankaSegmentKey('span-edge-2-3-left-bead-5'));
  });

  it('левая и правая грани одного узла — разные сегменты', () => {
    expect(silyankaSegmentKey('span-edge-2-3-left-bead-1'))
      .not.toBe(silyankaSegmentKey('span-edge-2-3-right-bead-1'));
  });

  it('верхняя и нижняя кромки группируются по пролёту', () => {
    expect(silyankaSegmentKey('span-edge-top-link-4-bead-2')).toBe('topLink:4');
    expect(silyankaSegmentKey('span-edge-bottom-link-4-bead-2')).toBe('bottomLink:4');
  });

  it('декор — столбик своей колонки: ряд полосы k в ключ не входит', () => {
    expect(silyankaSegmentKey('decor-4-1-2')).toBe(silyankaSegmentKey('decor-4-2-2'));
    expect(silyankaSegmentKey('decor-4-1-2')).not.toBe(silyankaSegmentKey('decor-4-1-3'));
  });

  it('чужой ID (например, подвеска) не даёт ключа', () => {
    expect(silyankaSegmentKey('pendant:abc:3')).toBeNull();
  });
});

describe('silyankaSegment', () => {
  it('собирает весь пролёт по любой его бисерине', () => {
    const index = buildSegmentIndex([
      bead('span-edge-2-3-left-bead-1'),
      bead('span-edge-2-3-left-bead-2'),
      bead('span-edge-2-3-left-bead-3'),
      bead('span-edge-2-3-right-bead-1'),
      bead('node-2-3'),
    ]);
    expect(silyankaSegment('span-edge-2-3-left-bead-2', index).sort()).toEqual([
      'span-edge-2-3-left-bead-1',
      'span-edge-2-3-left-bead-2',
      'span-edge-2-3-left-bead-3',
    ]);
  });

  it('узел отмечается в одиночку, соседние грани не задевает', () => {
    const index = buildSegmentIndex([
      bead('node-2-3'), bead('span-edge-2-3-left-bead-1'),
    ]);
    expect(silyankaSegment('node-2-3', index)).toEqual(['node-2-3']);
  });

  it('декор-столбик собирается целиком по всем рядам полосы', () => {
    const index = buildSegmentIndex([
      bead('decor-4-1-2'), bead('decor-4-2-2'), bead('decor-4-1-3'),
    ]);
    expect(silyankaSegment('decor-4-2-2', index).sort()).toEqual(['decor-4-1-2', 'decor-4-2-2']);
  });

  it('бисерина вне индекса остаётся сама по себе', () => {
    expect(silyankaSegment('node-9-9', buildSegmentIndex([]))).toEqual(['node-9-9']);
  });
});

describe('silyankaNodeSegment', () => {
  // Кейсы — точные составы шагов из экспорта разметки плетения (см. spec.md,
  // «Режим плетения»): проход нити идёт ОТ УЗЛА ДО УЗЛА — «узел → грань →
  // узел → грань → узел», обе грани по одну сторону центрального узла.
  const index = buildSegmentIndex([
    bead('node-1-0'), bead('node-1-1'),
    bead('node-2-1'),
    bead('node-3-0'), bead('node-3-1'),
    // нижние грани (2,1)
    bead('span-edge-2-1-left-bead-1'), bead('span-edge-2-1-left-bead-2'),
    bead('span-edge-2-1-right-bead-1'),
    // верхние грани (2,1): левая — от (1,0) right, правая — от (1,1) left
    bead('span-edge-1-0-right-bead-1'),
    bead('span-edge-1-1-left-bead-1'),
    // чужие грани — не должны попасть
    bead('span-edge-1-1-right-bead-1'),
    bead('span-edge-2-2-left-bead-1'),
  ]);

  it('шаг 6 разметки: node-1-0 → плечо (1,0)-right → node-2-1 → ножка (2,1)-left → node-3-0', () => {
    expect(silyankaNodeSegment(2, 1, 'left', index).sort()).toEqual([
      'node-1-0', 'node-2-1', 'node-3-0',
      'span-edge-1-0-right-bead-1',
      'span-edge-2-1-left-bead-1', 'span-edge-2-1-left-bead-2',
    ]);
  });

  it('сторона right того же узла: (1,1)-left сверху и (2,1)-right снизу, с их дальними узлами', () => {
    expect(silyankaNodeSegment(2, 1, 'right', index).sort()).toEqual([
      'node-1-1', 'node-2-1', 'node-3-1',
      'span-edge-1-1-left-bead-1',
      'span-edge-2-1-right-bead-1',
    ]);
  });

  it('шаг 1 разметки, старт: node-0-0 → (0,0)-left → node-1--1 → (1,-1)-right → node-2-0', () => {
    const idx = buildSegmentIndex([
      bead('node-0-0'), bead('node-1--1'), bead('node-2-0'),
      bead('span-edge-0-0-left-bead-1'),
      bead('span-edge-1--1-right-bead-1'),
      bead('span-edge-0-0-right-bead-1'), // чужая
    ]);
    expect(silyankaNodeSegment(1, -1, 'right', idx).sort()).toEqual([
      'node-0-0', 'node-1--1', 'node-2-0',
      'span-edge-0-0-left-bead-1',
      'span-edge-1--1-right-bead-1',
    ]);
  });

  it('шаг 10 разметки, подъём: node-6-1 → (5,1)-left → node-5-1 → (4,1)-right → node-4-1', () => {
    const idx = buildSegmentIndex([
      bead('node-4-1'), bead('node-5-1'), bead('node-6-1'),
      bead('span-edge-4-1-right-bead-1'),
      bead('span-edge-5-1-left-bead-1'),
    ]);
    expect(silyankaNodeSegment(5, 1, 'left', idx).sort()).toEqual([
      'node-4-1', 'node-5-1', 'node-6-1',
      'span-edge-4-1-right-bead-1',
      'span-edge-5-1-left-bead-1',
    ]);
  });

  it('шаг 5 разметки: у ряда 0 верхнее звено — пролёт цепочки: node-0-0 → top-link-0 → node-0-1 → (0,1)-left → node-1-0', () => {
    const idx = buildSegmentIndex([
      bead('node-0-0'), bead('node-0-1'), bead('node-1-0'),
      bead('span-edge-top-link-0-bead-1'),
      bead('span-edge-0-1-left-bead-1'),
      bead('span-edge-top-link-1-bead-1'), // чужой пролёт
    ]);
    expect(silyankaNodeSegment(0, 1, 'left', idx).sort()).toEqual([
      'node-0-0', 'node-0-1', 'node-1-0',
      'span-edge-0-1-left-bead-1',
      'span-edge-top-link-0-bead-1',
    ]);
  });

  it('у верхнего ряда без цепочки — узел + нижняя грань с её дальним узлом', () => {
    const idx = buildSegmentIndex([
      bead('node-0-1'), bead('node-1-0'), bead('span-edge-0-1-left-bead-1'),
    ]);
    expect(silyankaNodeSegment(0, 1, 'left', idx).sort()).toEqual([
      'node-0-1', 'node-1-0', 'span-edge-0-1-left-bead-1',
    ]);
  });

});

describe('silyankaNodeClickSegment', () => {
  // Сторона выводится из сетки, не из жеста: плетение идёт слева направо
  // (см. разметку шагов в spec.md).
  it('обычный узел берёт левую пару граней — шаг 6 разметки', () => {
    const idx = buildSegmentIndex([
      bead('node-1-0'), bead('node-2-1'), bead('node-3-0'),
      bead('span-edge-1-0-right-bead-1'),
      bead('span-edge-2-1-left-bead-1'),
      // правая пара есть, но не выбирается
      bead('span-edge-1-1-left-bead-1'),
      bead('span-edge-2-1-right-bead-1'),
    ]);
    expect(silyankaNodeClickSegment(2, 1, idx).sort()).toEqual([
      'node-1-0', 'node-2-1', 'node-3-0',
      'span-edge-1-0-right-bead-1',
      'span-edge-2-1-left-bead-1',
    ]);
  });

  it('крайний левый узел без левых граней идёт правой стороной — старт из шага 1', () => {
    const idx = buildSegmentIndex([
      bead('node-0-0'), bead('node-1--1'), bead('node-2-0'),
      bead('span-edge-0-0-left-bead-1'),
      bead('span-edge-1--1-right-bead-1'),
    ]);
    expect(silyankaNodeClickSegment(1, -1, idx).sort()).toEqual([
      'node-0-0', 'node-1--1', 'node-2-0',
      'span-edge-0-0-left-bead-1',
      'span-edge-1--1-right-bead-1',
    ]);
  });

  it('узел нижнего ряда — разворот: обе верхние грани (шаг 1, node-8-0)', () => {
    const idx = buildSegmentIndex([
      bead('node-7--1'), bead('node-7-0'), bead('node-8-0'),
      bead('span-edge-7--1-right-bead-1'),
      bead('span-edge-7-0-left-bead-1'),
    ]);
    expect(silyankaNodeClickSegment(8, 0, idx, { bottomRow: 8 }).sort()).toEqual([
      'node-7--1', 'node-7-0', 'node-8-0',
      'span-edge-7--1-right-bead-1',
      'span-edge-7-0-left-bead-1',
    ]);
  });

  it('узел нижнего ряда — противоположная сторона не обрубается, а берёт весь проход дальнего узла (зубец)', () => {
    // node-8-1 сходится из двух узлов ряда 7: node-7-0 (грань weavingSide,
    // просто закрывающий стежок) и node-7-1 (грань другой стороны — начало
    // следующего прохода вверх, у него есть свой узел ещё выше, node-6-1).
    const idx = buildSegmentIndex([
      bead('node-6-1'), bead('node-7-0'), bead('node-7-1'), bead('node-8-1'),
      bead('span-edge-6-1-right-bead-1'), bead('span-edge-6-1-right-bead-2'),
      bead('span-edge-7-0-right-bead-1'),
      bead('span-edge-7-1-left-bead-1'),
    ]);
    const merged = [
      'node-6-1', 'node-7-0', 'node-7-1', 'node-8-1',
      'span-edge-6-1-right-bead-1', 'span-edge-6-1-right-bead-2',
      'span-edge-7-0-right-bead-1',
      'span-edge-7-1-left-bead-1',
    ];
    expect(silyankaNodeClickSegment(8, 1, idx, { bottomRow: 8 }).sort()).toEqual(merged);

    // Клик по node-7-1 (или по любой его грани, см. silyankaPassCenter) сам
    // по себе не разворот — но его нижняя грань ведёт прямиком в bottomRow,
    // так что это «начало следующего прохода вверх» ЧУЖОГО разворота. Должен
    // подсветиться тот же объединённый сегмент, а не свой изолированный
    // обрубок (node-6-1 → node-7-1 → node-8-1 без node-7-0).
    expect(silyankaNodeClickSegment(7, 1, idx, { bottomRow: 8 }).sort()).toEqual(merged);
  });

  it('на отражённом полотне (Flip) экранное «слева» — правая пара граней сетки', () => {
    const idx = buildSegmentIndex([
      bead('node-1-0'), bead('node-1-1'),
      bead('node-2-1'),
      bead('node-3-0'), bead('node-3-1'),
      bead('span-edge-1-0-right-bead-1'), bead('span-edge-2-1-left-bead-1'),
      bead('span-edge-1-1-left-bead-1'), bead('span-edge-2-1-right-bead-1'),
    ]);
    expect(silyankaNodeClickSegment(2, 1, idx, { mirrored: true }).sort()).toEqual([
      'node-1-1', 'node-2-1', 'node-3-1',
      'span-edge-1-1-left-bead-1',
      'span-edge-2-1-right-bead-1',
    ]);
  });

  it('узел верхнего ряда с цепочкой — левый пролёт цепочки и левая ножка (шаг 5)', () => {
    const idx = buildSegmentIndex([
      bead('node-0-0'), bead('node-0-1'), bead('node-1-0'),
      bead('span-edge-top-link-0-bead-1'),
      bead('span-edge-0-1-left-bead-1'),
    ]);
    expect(silyankaNodeClickSegment(0, 1, idx).sort()).toEqual([
      'node-0-0', 'node-0-1', 'node-1-0',
      'span-edge-0-1-left-bead-1',
      'span-edge-top-link-0-bead-1',
    ]);
  });
});

describe('silyankaPassCenter', () => {
  // Раз сторона фиксирована, каждый пролёт входит ровно в один проход —
  // проверяем на парах граней из шагов разметки.
  it('шаг 6: оба пролёта ведут в один центр node-2-1', () => {
    expect(silyankaPassCenter('span-edge-2-1-left-bead-1')).toEqual({ r: 2, c: 1 });
    expect(silyankaPassCenter('span-edge-1-0-right-bead-2')).toEqual({ r: 2, c: 1 });
  });

  it('шаг 4: оба пролёта ведут в node-1-0 (нечётный ряд центра)', () => {
    expect(silyankaPassCenter('span-edge-1-0-left-bead-1')).toEqual({ r: 1, c: 0 });
    expect(silyankaPassCenter('span-edge-0-0-right-bead-1')).toEqual({ r: 1, c: 0 });
  });

  it('шаг 5: пролёт верхней цепочки ведёт в правый из своих узлов', () => {
    expect(silyankaPassCenter('span-edge-top-link-0-bead-1')).toEqual({ r: 0, c: 1 });
  });

  it('на отражённом полотне центры зеркальны', () => {
    expect(silyankaPassCenter('span-edge-2-1-right-bead-1', true)).toEqual({ r: 2, c: 1 });
    expect(silyankaPassCenter('span-edge-1-1-left-bead-1', true)).toEqual({ r: 2, c: 1 });
    expect(silyankaPassCenter('span-edge-top-link-0-bead-1', true)).toEqual({ r: 0, c: 0 });
  });

  it('нижняя цепочка и декор в проход не разворачиваются', () => {
    expect(silyankaPassCenter('span-edge-bottom-link-2-bead-1')).toBeNull();
    expect(silyankaPassCenter('decor-4-1-2')).toBeNull();
    expect(silyankaPassCenter('node-2-1')).toBeNull();
  });
});

describe('vertEdgeEndNodes', () => {
  it('чётный ряд: left → (r+1, c-1), right → (r+1, c)', () => {
    expect(vertEdgeEndNodes(2, 1, 'left')).toEqual({ top: { r: 2, c: 1 }, bottom: { r: 3, c: 0 } });
    expect(vertEdgeEndNodes(2, 1, 'right')).toEqual({ top: { r: 2, c: 1 }, bottom: { r: 3, c: 1 } });
  });

  it('нечётный ряд: left → (r+1, c), right → (r+1, c+1)', () => {
    expect(vertEdgeEndNodes(1, 0, 'left')).toEqual({ top: { r: 1, c: 0 }, bottom: { r: 2, c: 0 } });
    expect(vertEdgeEndNodes(1, 0, 'right')).toEqual({ top: { r: 1, c: 0 }, bottom: { r: 2, c: 1 } });
  });
});

describe('upperEdgeOf', () => {
  it('чётный ряд: left → (r-1, c-1), right → (r-1, c)', () => {
    expect(upperEdgeOf(2, 1, 'left')).toEqual({ r: 1, c: 0 });
    expect(upperEdgeOf(2, 1, 'right')).toEqual({ r: 1, c: 1 });
  });

  it('нечётный ряд: left → (r-1, c), right → (r-1, c+1)', () => {
    expect(upperEdgeOf(1, 0, 'left')).toEqual({ r: 0, c: 0 });
    expect(upperEdgeOf(1, 0, 'right')).toEqual({ r: 0, c: 1 });
  });
});

describe('silyankaNodeSpans', () => {
  // Инструмент «Hole segment» (GridSidebar, «Holes»): в отличие от
  // silyankaNodeSegment/silyankaNodeClickSegment (одна сторона одного
  // прохода нити) здесь нужны СРАЗУ все грани узла — обе исходящие вниз, обе
  // входящие сверху, соседняя top/bottom-кромка (только у своего ряда) и
  // декор-колонка.
  it('узел в середине сетки: обе исходящие, обе входящие грани и декор-колонка своей ноды', () => {
    const idx = buildSegmentIndex([
      bead('node-2-1'), bead('node-1-0'), bead('node-1-1'), bead('node-3-0'), bead('node-3-1'),
      // исходящие вниз
      bead('span-edge-2-1-left-bead-1'),
      bead('span-edge-2-1-right-bead-1'),
      // входящие сверху: left — из (1,0) right, right — из (1,1) left
      bead('span-edge-1-0-right-bead-1'),
      bead('span-edge-1-1-left-bead-1'),
      // декор-колонка этого узла
      bead('decor-2-1-1'),
      // чужие — не должны попасть
      bead('span-edge-1-0-left-bead-1'),
      bead('span-edge-2-2-left-bead-1'),
      bead('decor-2-1-2'), // декор чужой ноды (2,2) — та же строка id, другая колонка
    ]);
    expect(silyankaNodeSpans(2, 1, idx).sort()).toEqual([
      'decor-2-1-1',
      'span-edge-1-0-right-bead-1',
      'span-edge-1-1-left-bead-1',
      'span-edge-2-1-left-bead-1',
      'span-edge-2-1-right-bead-1',
    ]);
  });

  it('узел ряда 0: соседняя top-кромка входит, входящих граней сверху нет (ряда -1 не существует)', () => {
    const idx = buildSegmentIndex([
      bead('node-0-1'),
      bead('span-edge-0-1-left-bead-1'),
      bead('span-edge-0-1-right-bead-1'),
      bead('span-edge-top-link-0-bead-1'),
      bead('span-edge-top-link-1-bead-1'),
      bead('decor-0-1-1'),
      // чужие
      bead('span-edge-top-link-2-bead-1'),
      bead('span-edge-bottom-link-0-bead-1'), // bottomRow не передан — не должна попасть
    ]);
    expect(silyankaNodeSpans(0, 1, idx).sort()).toEqual([
      'decor-0-1-1',
      'span-edge-0-1-left-bead-1',
      'span-edge-0-1-right-bead-1',
      'span-edge-top-link-0-bead-1',
      'span-edge-top-link-1-bead-1',
    ]);
  });

  it('узел нижнего ряда (bottomRow передан явно): соседняя bottom-кромка входит', () => {
    const idx = buildSegmentIndex([
      bead('node-8-1'),
      bead('span-edge-7-0-right-bead-1'),
      bead('span-edge-7-1-left-bead-1'),
      bead('span-edge-bottom-link-0-bead-1'),
      bead('span-edge-bottom-link-1-bead-1'),
      bead('decor-8-1-1'),
      // чужие
      bead('span-edge-top-link-0-bead-1'), // r=8 !== 0 — не должна попасть
      bead('span-edge-bottom-link-2-bead-1'), // другая колонка
    ]);
    expect(silyankaNodeSpans(8, 1, idx, { bottomRow: 8 }).sort()).toEqual([
      'decor-8-1-1',
      'span-edge-7-0-right-bead-1',
      'span-edge-7-1-left-bead-1',
      'span-edge-bottom-link-0-bead-1',
      'span-edge-bottom-link-1-bead-1',
    ]);
  });

  it('регресс: узел в середине полотна не утаскивает чужую top/bottom-кромку той же колонки', () => {
    // topLink/bottomLink не намерены по ряду (id их не хранит — см. beadId.ts),
    // поэтому без явной проверки ряда узла (4,1) случайно подхватил бы кромки
    // чужих рядов 0/8, просто потому что колонка совпала.
    const idx = buildSegmentIndex([
      bead('node-4-1'),
      bead('span-edge-4-1-left-bead-1'),
      bead('span-edge-4-1-right-bead-1'),
      bead('span-edge-3-0-right-bead-1'),
      bead('span-edge-3-1-left-bead-1'),
      bead('decor-4-1-1'),
      // существуют в индексе, но принадлежат чужим рядам — не должны попасть
      bead('span-edge-top-link-0-bead-1'),
      bead('span-edge-top-link-1-bead-1'),
      bead('span-edge-bottom-link-0-bead-1'),
      bead('span-edge-bottom-link-1-bead-1'),
    ]);
    expect(silyankaNodeSpans(4, 1, idx, { bottomRow: 8 }).sort()).toEqual([
      'decor-4-1-1',
      'span-edge-3-0-right-bead-1',
      'span-edge-3-1-left-bead-1',
      'span-edge-4-1-left-bead-1',
      'span-edge-4-1-right-bead-1',
    ]);
  });
});

describe('crossWeaveCellOf', () => {
  // Сетка 4×5: горизонтальные ряды r=1,3 дают колонки 0..3,
  // вертикальные r=0,2,4 — колонки 0..2.
  const ids = new Set<string>();
  for (let r = 0; r < 5; r++) {
    const width = r % 2 === 0 ? 3 : 4;
    for (let c = 0; c < width; c++) ids.add(`bead-${r}-${c}`);
  }
  const cell10 = ['bead-1-0', 'bead-0-0', 'bead-2-0', 'bead-1-1'];

  it('горизонтальная бисерина замыкает ячейку слева — там она правая', () => {
    expect(crossWeaveCellOf('bead-1-1', ids)).toEqual(cell10);
  });

  it('вертикальная бисерина замыкает ячейку сверху — там она нижняя', () => {
    expect(crossWeaveCellOf('bead-2-0', ids)).toEqual(cell10);
  });

  it('выбор не зависит от места клика — одна бисерина всегда даёт один крестик', () => {
    expect(crossWeaveCellOf('bead-1-1', ids)).toEqual(crossWeaveCellOf('bead-1-1', ids));
  });

  it('замыкаемой ячейки нет (край) — берётся вторая', () => {
    // bead-0-0 — верхний ряд, ячейки над ним нет: берётся та, где она верхняя
    expect(crossWeaveCellOf('bead-0-0', ids)).toEqual(cell10);
    // bead-1-0 — первая колонка, ячейки слева нет: берётся та, где она левая
    expect(crossWeaveCellOf('bead-1-0', ids)).toEqual(cell10);
  });

  it('в замыкаемой ячейке всё отмечено — берётся вторая, где есть что отметить', () => {
    // плетение вправо: ячейка (1,0) уже сплетена, клик по её правой бисерине
    // (она же левая в (1,1)) должен открыть следующий крестик, а не вернуться
    const marked = new Set(cell10);
    expect(crossWeaveCellOf('bead-1-1', ids, (id) => marked.has(id))).toEqual([
      'bead-1-1', 'bead-0-1', 'bead-2-1', 'bead-1-2',
    ]);
  });

  it('поворот плетения вниз: клик по правой бисерине берёт крестик под предыдущим', () => {
    // сплетена ячейка (1,1); поворачиваем вниз — нужен крестик (3,1),
    // его верхняя бисерина bead-2-1 уже отмечена
    const marked = new Set(['bead-1-1', 'bead-0-1', 'bead-2-1', 'bead-1-2']);
    expect(crossWeaveCellOf('bead-3-2', ids, (id) => marked.has(id))).toEqual([
      'bead-3-1', 'bead-2-1', 'bead-4-1', 'bead-3-2',
    ]);
  });

  it('полной ячейки нет ни с одной стороны — null', () => {
    expect(crossWeaveCellOf('bead-1-99', ids)).toBeNull();
    expect(crossWeaveCellOf('node-1-0', ids)).toBeNull();
  });
});
