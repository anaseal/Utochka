import { BEAD_THEME } from '../config/theme';
import { clamp } from './clamp';

export const resolveSpanCount = (
  r: number,
  topSpan: number,
  bottomSpan: number,
  overrides: Record<number, number> = {},
): number => overrides[r] ?? (r % 2 === 0 ? bottomSpan : topSpan);

export const clampSpan = (n: number): number => {
  const { minSpan, maxSpan } = BEAD_THEME.constraints;
  return clamp(n, minSpan, maxSpan);
};
