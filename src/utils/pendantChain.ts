import { BEAD_THEME } from '../config/theme';

// Отдельное пространство ID для бисерин цепочки-подвески, не пересекается ни
// с id основной сетки (beadId.ts), ни с pendant:* (см. floodFill.ts) — цепочка
// крепится к двум произвольным узлам нижнего ряда, а не к одному якорю.
const CHAIN_PREFIX = 'chain:';

export const chainBeadId = (placementId: string, index: number): string =>
  `${CHAIN_PREFIX}${placementId}:${index}`;

export const isChainBeadId = (id: string): boolean => id.startsWith(CHAIN_PREFIX);

export const parseChainBeadId = (id: string): [string, number] => {
  const [, placementId, indexStr] = id.split(':');
  return [placementId, Number(indexStr)];
};

// Нитка не может «перепрыгнуть» бисерины цепочки-подвески — те уже физически
// нанизаны друг за другом. Поэтому если трассировка нитки перескакивает с
// одной бисерины цепочки сразу на другую бисерину ТОЙ ЖЕ цепочки (например,
// с первой сразу на последнюю), путь достраивается через все промежуточные —
// в любом направлении (первая→последняя и наоборот). Для разных цепочек или
// не-цепочечных id возвращает null — вызывающий код просто добавляет toId как есть.
export const expandChainRun = (fromId: string, toId: string): string[] | null => {
  if (!isChainBeadId(fromId) || !isChainBeadId(toId)) return null;
  const [fromPlacementId, fromIndex] = parseChainBeadId(fromId);
  const [toPlacementId, toIndex] = parseChainBeadId(toId);
  if (fromPlacementId !== toPlacementId || fromIndex === toIndex) return null;
  const step = toIndex > fromIndex ? 1 : -1;
  const run: string[] = [];
  for (let i = fromIndex + step; i !== toIndex; i += step) {
    run.push(chainBeadId(fromPlacementId, i));
  }
  run.push(toId);
  return run;
};

// Шаг между соседними бисеринами (минимальный шаг без наложения — та же
// формула, что даёт minBeadPitch в generator.ts). Бисерины цепочки всегда
// лежат друг от друга и от узлов-креплений ровно на этом расстоянии — иначе
// цепочка визуально «не касается» узла или соседней бисерины.
const CHAIN_PITCH = BEAD_THEME.sizes.spanRadius * 2 + 2;

// Доля «лишней» длины нити сверх хорды (расстояния между узлами) — источник
// провиса, см. pendantChainDefaults в theme.ts.
const slackRatioFor = (distance: number): number => {
  const { slackCoef, slackMin, slackMax } = BEAD_THEME.pendantChainDefaults;
  if (distance <= 0) return slackMax;
  const ratio = slackCoef / Math.sqrt(distance);
  return Math.min(slackMax, Math.max(slackMin, ratio));
};

// Число бисерин в цепочке зависит от расстояния между узлами-креплениями:
// далёкие друг от друга узлы дают более длинную цепочку. Считается из
// «нужной» длины нити (хорда + запас на провис), поделённой на pitch —
// то же значение, что задаёт итоговую длину дуги в computeChainBeadPositions,
// поэтому число бисерин и их фактический шаг всегда согласованы.
export const getChainBeadCount = (distance: number): number => {
  const strandLength = distance * (1 + slackRatioFor(distance));
  return Math.max(1, Math.round(strandLength / CHAIN_PITCH) - 1);
};

export interface ChainBeadPosition {
  x: number;
  y: number;
}

export const chainBeadCountBetween = (
  start: ChainBeadPosition,
  end: ChainBeadPosition,
): number => getChainBeadCount(Math.hypot(end.x - start.x, end.y - start.y));

// Половинный угол дуги θ, для которой хорда стягивает дугу длины k·хорда:
// из геометрии окружности L = 2Rθ, D = 2R·sinθ ⇒ θ/sinθ = L/D = k.
// θ/sinθ монотонно растёт на (0, π), поэтому решаем бисекцией.
const solveHalfAngle = (k: number): number => {
  if (k <= 1) return 0;
  let lo = 1e-6;
  let hi = Math.PI - 1e-6;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (mid / Math.sin(mid) < k) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
};

// Бисерины цепочки лежат на круговой дуге между узлами: длина дуги (pitch ×
// число промежутков) всегда чуть больше хорды на slackRatio (см. выше),
// поэтому дуга и провис получаются из одной и той же геометрии окружности,
// а не задаются независимо — это гарантирует, что соседние бисерины (и
// крайние бисерины с узлами-креплениями) всегда на расстоянии ровно pitch
// друг от друга по дуге, т.е. визуально касаются.
export const computeChainBeadPositions = (
  start: ChainBeadPosition,
  end: ChainBeadPosition,
): ChainBeadPosition[] => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const count = getChainBeadCount(distance);
  const positions: ChainBeadPosition[] = [];
  if (distance <= 0) {
    for (let i = 1; i <= count; i++) positions.push({ x: start.x, y: start.y });
    return positions;
  }

  const strandLength = CHAIN_PITCH * (count + 1);
  const halfAngle = solveHalfAngle(strandLength / distance);
  const ux = dx / distance;
  const uy = dy / distance;
  // Перпендикуляр к хорде, направленный «вниз» по экрану (+y) — провис
  // цепочки-подвески всегда идёт от узлов вниз, а не в произвольную сторону.
  let vx = -uy;
  let vy = ux;
  if (vy < 0) { vx = -vx; vy = -vy; }

  if (halfAngle === 0) {
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      positions.push({ x: start.x + t * dx, y: start.y + t * dy });
    }
    return positions;
  }

  const radius = distance / (2 * Math.sin(halfAngle));
  const sagDepth = radius * (1 - Math.cos(halfAngle));
  for (let i = 1; i <= count; i++) {
    const s = i / (count + 1);
    const phi = halfAngle * (2 * s - 1);
    const u = distance / 2 + radius * Math.sin(phi);
    const v = sagDepth - radius + radius * Math.cos(phi);
    positions.push({ x: start.x + ux * u + vx * v, y: start.y + uy * u + vy * v });
  }
  return positions;
};
