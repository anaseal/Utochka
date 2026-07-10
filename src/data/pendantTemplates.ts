import { PendantTemplate } from '../types/pendant';
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
];

export const PENDANT_TEMPLATES_BY_ID: Record<string, PendantTemplate> =
  Object.fromEntries(PENDANT_TEMPLATES.map((t) => [t.id, t]));
