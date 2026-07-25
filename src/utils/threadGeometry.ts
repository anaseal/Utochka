import { ThreadAnchor } from './beadPositions';

// Бусины, геометрически лежащие «на пути» между двумя уже разрешёнными
// точками трассировки нитки (fromId → toId) — в отличие от expandChainRun
// (utils/pendantChain.ts), не знает о схемах id конкретных слоёв, работает
// по одной карте координат сразу для сетки/подвесок/цепочек. Возвращает id,
// упорядоченные по проекции вдоль отрезка (от fromId к toId) — так, чтобы
// вставка результата в путь трассировки была эквивалентна кликам по каждой
// из них по очереди. excludeIds — бусины, уже присутствующие в трассировке
// (защита от дублей/циклов при автозаполнении). perpendicularTolerance —
// порог допуска до прямой, вызывающий код передаёт свой hitboxRadius (та же
// мера, что и «докуда магнитится клик» в findNearestThreadAnchor).
export const findBeadsAlongSegment = (
  positionIndex: Map<string, ThreadAnchor>,
  fromId: string,
  toId: string,
  excludeIds: ReadonlySet<string>,
  perpendicularTolerance: number,
): string[] => {
  const from = positionIndex.get(fromId);
  const to = positionIndex.get(toId);
  if (!from || !to) return [];

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return [];

  const candidates: { id: string; t: number }[] = [];
  for (const [id, pos] of positionIndex) {
    if (id === fromId || id === toId || excludeIds.has(id)) continue;
    const t = ((pos.x - from.x) * dx + (pos.y - from.y) * dy) / lengthSq;
    if (t <= 0 || t >= 1) continue;
    const projX = from.x + t * dx;
    const projY = from.y + t * dy;
    const perpDist = Math.hypot(pos.x - projX, pos.y - projY);
    if (perpDist <= perpendicularTolerance) candidates.push({ id, t });
  }

  candidates.sort((a, b) => a.t - b.t);
  return candidates.map(c => c.id);
};
