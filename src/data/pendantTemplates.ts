import { PendantTemplate, PendantTemplateBead } from '../types/pendant';
import { BEAD_THEME } from '../config/theme';

/**
 * Шаблоны заданы в координатах макета: нормальная бусина имеет радиус 18,
 * как нода сетки в макете. При рендере всё умножается на PENDANT_SCALE,
 * чтобы нормальная бусина совпала с размером ноды сетки.
 */
export const PENDANT_SCALE = BEAD_THEME.sizes.nodeRadius / 18;

const R = 18;     // обычная бусина
const R_BIG = 23.5; // крупная фокусная
const R_BERRY = 11.5; // мелкая бусина грозди
const R_CLUSTER = 14; // бусина тройной грозди

// Контур капли (тир-дроп): острый угол в вершине (apexY, там, где обе
// касательные линии сходятся к якорной ноде) и полукруглое закругление внизу
// (большая дуга окружности радиуса radius с центром circleCenterY). Контур —
// правая касательная (apex → правая точка касания) + большая дуга снизу
// (в обход нижней части окружности, а не короткий путь мимо вершины) + левая
// касательная (левая точка касания → apex). Бусины расставлены равномерно по
// ДЛИНЕ этого контура, а не по параметру — иначе шаг между ними был бы
// неровным на стыке прямых и дуги.
function teardropPerimeterPoints(
  apexY: number, circleCenterY: number, radius: number, count: number,
): { dx: number; dy: number }[] {
  const d = circleCenterY - apexY;
  const tangentLen = Math.sqrt(d * d - radius * radius);
  const tRight = { x: (radius * tangentLen) / d, y: circleCenterY - (radius * radius) / d };
  const tLeft = { x: -tRight.x, y: tRight.y };

  const angleRight = Math.atan2(tRight.y - circleCenterY, tRight.x);
  const angleLeftRaw = Math.atan2(tLeft.y - circleCenterY, tLeft.x);
  // Большая дуга идёт от правой точки касания через низ (θ=90°) к левой —
  // если "сырой" угол левой точки меньше правого, он лежит по другую сторону
  // вершины, поэтому прибавляем полный оборот, чтобы дуга шла в обход низа.
  const angleLeft = angleLeftRaw < angleRight ? angleLeftRaw + 2 * Math.PI : angleLeftRaw;
  const arcSweep = angleLeft - angleRight;
  const arcLen = radius * arcSweep;
  const totalLen = 2 * tangentLen + arcLen;

  const pointAt = (s: number): { x: number; y: number } => {
    if (s <= tangentLen) {
      const t = s / tangentLen;
      return { x: t * tRight.x, y: apexY + t * (tRight.y - apexY) };
    }
    const s2 = s - tangentLen;
    if (s2 <= arcLen) {
      const theta = angleRight + (s2 / arcLen) * arcSweep;
      return { x: radius * Math.cos(theta), y: circleCenterY + radius * Math.sin(theta) };
    }
    const t = (s2 - arcLen) / tangentLen;
    return { x: tLeft.x + t * (0 - tLeft.x), y: tLeft.y + t * (apexY - tLeft.y) };
  };

  return Array.from({ length: count }, (_, k) => {
    const p = pointAt(((k + 1) / (count + 1)) * totalLen);
    return { dx: Math.round(p.x * 10) / 10, dy: Math.round(p.y * 10) / 10 };
  });
}

// Петля тесно посаженных бисерин в форме капли: острый угол у якорной ноды
// (обе ветви петли сходятся в одну точку), закруглённый низ. Первая (i=0) и
// последняя (i=19) бусины — ближе всего к вершине, по разные стороны от неё.
// Радиус/расстояние до вершины подобраны так, чтобы шаг между соседними
// бисеринами по контуру (totalLen / (count+1)) был чуть БОЛЬШЕ их диаметра
// (2·R_BERRY = 23) — бусины соприкасаются вплотную, но не налезают друг на
// друга (при меньшем контуре тот же шаг оказывается меньше диаметра, и
// бусины начинают перекрываться).
const LOOP_BEAD_COUNT = 20;
// LOOP_APEX_Y — координата самой вершины капли (невидимая точка схождения
// касательных), а НЕ первой бусины: первая бусина лежит дальше по касательной
// (~19% её длины), поэтому 18, а не 40 — иначе итоговый отступ до первой
// видимой бусины оказался бы заметно больше, чем dy=40 первой бусины у
// Drop/Rhombus/Cluster. При 18 первая бусина оказывается на том же
// расстоянии от ноды (~40 единиц), что и у остальных шаблонов.
const LOOP_APEX_Y = 18;
const LOOP_CIRCLE_RADIUS = 62;
const LOOP_APEX_TO_CENTER = 140;
const LOOP_CIRCLE_CENTER_Y = LOOP_APEX_Y + LOOP_APEX_TO_CENTER;
const loopBeads: PendantTemplateBead[] = teardropPerimeterPoints(
  LOOP_APEX_Y, LOOP_CIRCLE_CENTER_Y, LOOP_CIRCLE_RADIUS, LOOP_BEAD_COUNT,
).map(({ dx, dy }): PendantTemplateBead => ({
  dx, dy, shape: 'circle', r: R_BERRY, type: 'SPAN',
}));
const loopLinks: [number, number][] = [
  ...Array.from({ length: LOOP_BEAD_COUNT - 1 }, (_, i): [number, number] => [i, i + 1]),
  // Обе ветви петли физически смыкаются у вершины рядом с якорем.
  [LOOP_BEAD_COUNT - 1, 0],
];

export const PENDANT_TEMPLATES: PendantTemplate[] = [
  {
    id: 'drop-simple',
    name: 'Drop',
    beads: [
      { dx: 0, dy: 40, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 80, shape: 'circle', r: R, type: 'NODE' },
    ],
    links: [[0, 1]],
  },
  {
    id: 'rhombus',
    name: 'Rhombus',
    beads: [
      { dx: 0, dy: 40, shape: 'circle', r: R, type: 'NODE' },
      { dx: -24, dy: 70, shape: 'circle', r: R, type: 'NODE' },
      { dx: 24, dy: 70, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 100, shape: 'circle', r: R, type: 'NODE' },
    ],
    links: [[0, 1], [0, 2], [1, 3], [2, 3]],
  },
  {
    id: 'triangle',
    name: 'Cluster',
    beads: [
      { dx: -24, dy: 33, shape: 'circle', r: R, type: 'NODE' },
      { dx: 24, dy: 33, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 61, shape: 'circle', r: R, type: 'NODE' },
    ],
    links: [[0, 2], [1, 2]],
  },
  {
    id: 'fringe',
    name: 'Fringe',
    beads: [
      { dx: 0, dy: 40, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 80, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 120, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 160, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 205, shape: 'circle', r: R_BIG, type: 'NODE' },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    id: 'net',
    name: 'Net',
    beads: [
      { dx: 0, dy: 40, shape: 'circle', r: R, type: 'NODE' },
      { dx: -20, dy: 74, shape: 'circle', r: R, type: 'NODE' },
      { dx: 20, dy: 74, shape: 'circle', r: R, type: 'NODE' },
      { dx: -34, dy: 111, shape: 'circle', r: R, type: 'NODE' },
      { dx: 34, dy: 111, shape: 'circle', r: R, type: 'NODE' },
      { dx: -20, dy: 148, shape: 'circle', r: R, type: 'NODE' },
      { dx: 20, dy: 148, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 182, shape: 'circle', r: R, type: 'NODE' },
    ],
    links: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 6], [5, 7], [6, 7]],
  },
  {
    id: 'net-cluster',
    name: 'Net with cluster',
    beads: [
      { dx: 0, dy: 41, shape: 'circle', r: R, type: 'NODE' },
      { dx: -20, dy: 75, shape: 'circle', r: R, type: 'NODE' },
      { dx: 20, dy: 75, shape: 'circle', r: R, type: 'NODE' },
      { dx: -34, dy: 112, shape: 'circle', r: R, type: 'NODE' },
      { dx: 34, dy: 112, shape: 'circle', r: R, type: 'NODE' },
      { dx: -20, dy: 149, shape: 'circle', r: R, type: 'NODE' },
      { dx: 20, dy: 149, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 183, shape: 'circle', r: R, type: 'NODE' },
      { dx: -24, dy: 214, shape: 'circle', r: R, type: 'NODE' },
      { dx: 24, dy: 214, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 242, shape: 'circle', r: R, type: 'NODE' },
    ],
    links: [
      [0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 6], [5, 7], [6, 7],
      [7, 8], [7, 9], [8, 10], [9, 10],
    ],
  },
  {
    id: 'focal-berry',
    name: 'Drop with cluster',
    beads: [
      { dx: 0, dy: 40, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 79, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 123, shape: 'circle', r: R_BIG, type: 'NODE' },
      { dx: -13, dy: 159, shape: 'circle', r: R_BERRY, type: 'SPAN' },
      { dx: 13, dy: 159, shape: 'circle', r: R_BERRY, type: 'SPAN' },
      { dx: -27, dy: 179, shape: 'circle', r: R_BERRY, type: 'SPAN' },
      { dx: 27, dy: 179, shape: 'circle', r: R_BERRY, type: 'SPAN' },
      { dx: -13, dy: 199, shape: 'circle', r: R_BERRY, type: 'SPAN' },
      { dx: 13, dy: 199, shape: 'circle', r: R_BERRY, type: 'SPAN' },
    ],
    links: [[0, 1], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 8]],
  },
  {
    id: 'bugle',
    name: 'Bugle bead',
    beads: [
      { dx: 0, dy: 41, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 80, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 130, shape: 'rect', w: 13, h: 58, type: 'SPAN' },
      { dx: -17, dy: 169, shape: 'circle', r: R_CLUSTER, type: 'SPAN' },
      { dx: 17, dy: 169, shape: 'circle', r: R_CLUSTER, type: 'SPAN' },
      { dx: 0, dy: 194, shape: 'circle', r: R_CLUSTER, type: 'SPAN' },
    ],
    links: [[0, 1], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]],
  },
  {
    id: 'loop',
    name: 'Loop',
    beads: loopBeads,
    links: loopLinks,
  },
];

export const PENDANT_TEMPLATES_BY_ID: Record<string, PendantTemplate> =
  Object.fromEntries(PENDANT_TEMPLATES.map((t) => [t.id, t]));
