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

// Число бисерин в цепочке зависит от расстояния между узлами-креплениями:
// шаг между соседними бисеринами держится примерно постоянным (минимальный шаг
// без наложения — та же формула, что даёт minBeadPitch в generator.ts), поэтому
// далёкие друг от друга узлы дают более длинную цепочку.
export const getChainBeadCount = (distance: number): number => {
  const pitch = BEAD_THEME.sizes.spanRadius * 2 + 2;
  return Math.max(1, Math.round(distance / pitch) - 1);
};

export interface ChainBeadPosition {
  x: number;
  y: number;
}

export const chainBeadCountBetween = (
  start: ChainBeadPosition,
  end: ChainBeadPosition,
): number => getChainBeadCount(Math.hypot(end.x - start.x, end.y - start.y));

// Глубина провиса в середине дуги: sagScale · distance^sagExponent.
// Не линейно от расстояния (в отличие от прежней версии) — при sagExponent < 1
// отношение sag/distance убывает с ростом distance, поэтому короткая цепочка
// (мало бисерин, например между 3 нодами) может провисать глубоко
// относительно своей длины, а длинная (между 50 нодами) — уже нет: линейный
// рост выглядел бы неестественно растянутым на большом расстоянии.
const sagDepthFor = (distance: number): number => {
  const { sagScale, sagExponent } = BEAD_THEME.pendantChainDefaults;
  return sagScale * Math.pow(distance, sagExponent);
};

// Полукруглый провис между двумя узлами: бисерины расходятся от узлов к
// середине по sin-профилю (как generateArcSpan в generator.ts), но глубина
// провиса зависит от расстояния нелинейно (см. sagDepthFor) — тут это
// отдельная подвеска произвольной длины, а не тонкая кромка между соседями.
export const computeChainBeadPositions = (
  start: ChainBeadPosition,
  end: ChainBeadPosition,
): ChainBeadPosition[] => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const count = getChainBeadCount(distance);
  const sagDepth = sagDepthFor(distance);
  const positions: ChainBeadPosition[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    positions.push({
      x: start.x + t * dx,
      y: start.y + t * dy + sagDepth * Math.sin(Math.PI * t),
    });
  }
  return positions;
};
