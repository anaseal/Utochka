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
  },
  {
    id: 'triangle',
    name: 'Cluster',
    beads: [
      { dx: -24, dy: 33, shape: 'circle', r: R, type: 'NODE' },
      { dx: 24, dy: 33, shape: 'circle', r: R, type: 'NODE' },
      { dx: 0, dy: 61, shape: 'circle', r: R, type: 'NODE' },
    ],
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
  },
];

export const PENDANT_TEMPLATES_BY_ID: Record<string, PendantTemplate> =
  Object.fromEntries(PENDANT_TEMPLATES.map((t) => [t.id, t]));
