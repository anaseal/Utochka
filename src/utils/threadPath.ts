export interface ThreadPoint {
  x: number;
  y: number;
}

const catmullRomControlPoints = (
  p0: ThreadPoint, p1: ThreadPoint, p2: ThreadPoint, p3: ThreadPoint,
): [ThreadPoint, ThreadPoint] => [
  { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
  { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
];

// Гладкая кривая через все опорные точки (Catmull-Rom → кубический безье на
// каждом отрезке) — визуально настоящая нитка, огибающая бусины, а не ломаная
// линия по точкам магнита. Виртуальные точки перед первой/после последней —
// зеркальное отражение соседней пары (стандартный приём Catmull-Rom для
// естественного натяжения на концах без провисания за пределы крайних бусин).
export const buildThreadPathD = (points: ThreadPoint[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const last = points.length - 1;
  const extended: ThreadPoint[] = [
    { x: 2 * points[0].x - points[1].x, y: 2 * points[0].y - points[1].y },
    ...points,
    { x: 2 * points[last].x - points[last - 1].x, y: 2 * points[last].y - points[last - 1].y },
  ];

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [cp1, cp2] = catmullRomControlPoints(extended[i], extended[i + 1], extended[i + 2], extended[i + 3]);
    const end = extended[i + 2];
    d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  }
  return d;
};
