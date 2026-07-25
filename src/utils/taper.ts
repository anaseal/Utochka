import { Taper, TaperSide } from '../types/bead';

// Целевой инсет (в колонках, дробный) для одной стороны на расстоянии `dist`
// узловых рядов от её кромки (r для top, 2·height−r для bottom). Depth —
// ОБЩИЙ для обеих сторон (см. Taper в types/bead.ts), задан в половинках
// колонки — это ПОЛ ширины всего полотна, к которому инсет сходится и на
// котором держится сколь угодно далеко от кромки (не 0, если depth > 0).
// Rows — стартовый инсет у самой кромки этой стороны; убывает на 0.5 колонки
// за КАЖДЫЙ узловой ряд (а не за пару), пока не упрётся в пол depth/2.
// rows=0 — сторона выключена целиком (в отличие от depth=0, который лишь
// опускает общий пол до нуля, но кромки активных сторон по-прежнему сужены
// по своим rows).
const sideTarget = (side: TaperSide, dist: number, depth: number): number =>
  side.rows > 0 ? Math.max(depth / 2, side.rows - dist / 2) : 0;

// Срез по целому числу колонок — ряд физически смещён на пол-шага (нечётные
// ряды) и его колонки отсчитываются от minC(r) (Edge Extension, см.
// columnRange.ts), поэтому оба сдвига нужно вычесть из целевого инсета ДО
// округления вверх — иначе целочисленный срез не попадает точно на
// дробную целевую линию и получаются те самые скачки/уступы (см. spec.md).
// round вместо ceil здесь не годится: пол в 0.5 колонки должен ГАРАНТИРОВАННО
// достигаться (никогда не отступать наружу за целевую линию), а не
// округляться то в одну, то в другую сторону.
export const getTaperColumnCut = (
  taper: Taper,
  r: number,
  height: number,
  minC: number,
): number => {
  const rMax = 2 * height;
  const target = Math.max(
    sideTarget(taper.top, r, taper.depth),
    sideTarget(taper.bottom, rMax - r, taper.depth)
  );
  if (target <= 0) return 0;
  const shift = r % 2 !== 0 ? 0.5 : 0;
  return Math.max(0, Math.ceil(target - shift - minC));
};
