import { Taper, TaperSide } from '../types/bead';

// Целевой инсет (в колонках, дробный) для одной стороны на расстоянии `dist`
// узловых рядов от её кромки (r для top, 2·height−r для bottom). Depth —
// ОБЩИЙ для обеих сторон (см. Taper в types/bead.ts), задан в половинках
// колонки — это ПОЛ ширины всего полотна, к которому инсет сходится и на
// котором держится сколь угодно далеко от кромки (не 0, если depth > 0).
// Rows — стартовый инсет у самой кромки этой стороны; убывает на 0.5 колонки
// за КАЖДЫЙ узловой ряд (а не за пару), пока не упрётся в пол depth/2.
// rows=0 — сторона выключена целиком; при rows=0 с ОБЕИХ сторон depth не
// делает ничего (см. spec.md — в UI степпер Depth в этом случае заблокирован).
const sideTarget = (side: TaperSide, dist: number, depth: number): number =>
  side.rows > 0 ? Math.max(depth / 2, side.rows - dist / 2) : 0;

export interface TaperColumnCuts {
  left: number;
  right: number;
}

// Сколько колонок срезать с левого и с правого края ряда r. Стороны считаются
// НЕЗАВИСИМО, каждая от своей кромки полотна, — одинаковое число колонок с
// обеих сторон годилось бы только для симметричного ряда, а при выключенном с
// одной стороны Edge Extension ряд несимметричен (см. columnRange.ts), и общий
// срез уводил бы правый край на полколонки от целевой линии. Симптом был
// такой: у края оставались узлы, к которым не подходит ни один пролёт (оба
// соседа в соседних рядах срезаны) — бисерина, которую физически не на чем
// сплести. При симметричном Edge Extension (дефолт) формула даёт ровно тот же
// результат, что и прежний общий срез.
//
// Считаем не в индексах колонок, а в физическом положении узла вдоль ряда:
// `p = c + shift`, где shift = 0.5 у сдвинутых (нечётных) рядов. Узел уцелел,
// если p не ближе target к любому из краёв номинальной ширины: target ≤ p ≤
// (width−1) − target. Округление наружу от целевой линии (ceil слева, floor
// справа) — не произвольный выбор: пол depth должен ГАРАНТИРОВАННО
// достигаться, срез никогда не должен отступать наружу за целевую линию.
export const getTaperColumnCuts = (
  taper: Taper,
  r: number,
  height: number,
  width: number,
  minC: number,
  maxC: number,
): TaperColumnCuts => {
  const rMax = 2 * height;
  const target = Math.max(
    sideTarget(taper.top, r, taper.depth),
    sideTarget(taper.bottom, rMax - r, taper.depth)
  );
  if (target <= 0) return { left: 0, right: 0 };

  const shift = r % 2 !== 0 ? 0.5 : 0;
  const firstAlive = Math.ceil(target - shift);
  const lastAlive = Math.floor(width - 1 - target - shift);
  return {
    left: Math.max(0, firstAlive - minC),
    right: Math.max(0, maxC - lastAlive),
  };
};
