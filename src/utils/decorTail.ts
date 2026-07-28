// Отдельное пространство ID для бисерин индивидуального декор-хвоста
// (DecorTailPlacement) — не пересекается ни с id основной сетки (beadId.ts,
// в т.ч. с decor-{r}-{k}-{c} у Decor Bands, полосы на весь ряд), ни с
// pendant:*/chain:* (см. floodFill.ts/pendantChain.ts). Хвост крепится к
// одному узлу нижнего ряда и свободен на конце — модель ближе к chain:*
// (один якорь + линейная цепочка бисерин), чем к pendant:* (шаблон с
// произвольными смещениями).
const DECOR_TAIL_PREFIX = 'decorTail:';

export const decorTailBeadId = (placementId: string, index: number): string =>
  `${DECOR_TAIL_PREFIX}${placementId}:${index}`;

export const isDecorTailBeadId = (id: string): boolean => id.startsWith(DECOR_TAIL_PREFIX);

export const parseDecorTailBeadId = (id: string): [string, number] => {
  const [, placementId, indexStr] = id.split(':');
  return [placementId, Number(indexStr)];
};

export interface DecorTailAnchor {
  x: number;
  y: number;
}

export interface DecorTailBeadPosition {
  x: number;
  y: number;
}

// Хвост — прямая колонка бисерин строго под якорной нодой, тем же шагом, что
// и у Decor Bands (getDecorRowStep, decorGeometry.ts), поэтому визуально не
// отличается от «встроенной» полосы генератора.
export const computeDecorTailBeadPositions = (
  anchor: DecorTailAnchor,
  rows: number,
  decorRowStep: number,
): DecorTailBeadPosition[] => {
  const positions: DecorTailBeadPosition[] = [];
  for (let k = 1; k <= rows; k++) {
    positions.push({ x: anchor.x, y: anchor.y + k * decorRowStep });
  }
  return positions;
};
