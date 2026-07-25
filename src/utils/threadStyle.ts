import type { CSSProperties } from 'react';
import { hexToRgba } from './color';

export interface ThreadStyleSource {
  color?: string;
  opacity?: number;
  strand?: 1 | 2;
}

// Единая точка «каким CSS-цветом рисовать эту нитку» — используется и для
// уже проложенных ниток (ThreadLayer), и для превью незавершённой
// трассировки (та же логика, что применится нитке при коммите). color
// приоритетнее strand — явный выбор пользователя (см. types/thread.ts)
// переопределяет дефолт по номеру нити crossWeave. Ни color, ни strand —
// undefined, стили не переопределяются, CSS сам подставит --thread-color.
export const threadColorStyle = (t: ThreadStyleSource | null | undefined): CSSProperties | undefined => {
  if (!t) return undefined;
  if (t.color) return { '--thread-color-effective': hexToRgba(t.color, t.opacity ?? 1) } as CSSProperties;
  if (t.strand === 2) return { '--thread-color-effective': 'var(--thread-color-2)' } as CSSProperties;
  return undefined;
};
