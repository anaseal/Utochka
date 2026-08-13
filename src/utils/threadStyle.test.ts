import { describe, it, expect } from 'vitest';
import { threadColorStyle } from './threadStyle';
import { hexToRgba } from './color';

describe('threadColorStyle', () => {
  it('paints the thread with its own color', () => {
    expect(threadColorStyle({ color: '#ff4757' }))
      .toEqual({ '--thread-color-effective': hexToRgba('#ff4757', 1) });
  });

  it('applies opacity to that color', () => {
    expect(threadColorStyle({ color: '#ff4757', opacity: 0.5 }))
      .toEqual({ '--thread-color-effective': hexToRgba('#ff4757', 0.5) });
  });

  // Явный выбор пользователя перекрывает дефолт по номеру нити крестика.
  it('prefers an explicit color over the strand default', () => {
    expect(threadColorStyle({ color: '#ff4757', strand: 2 }))
      .toEqual({ '--thread-color-effective': hexToRgba('#ff4757', 1) });
  });

  it('gives the second strand its own token', () => {
    expect(threadColorStyle({ strand: 2 }))
      .toEqual({ '--thread-color-effective': 'var(--thread-color-2)' });
  });

  // Ничего не переопределяем — CSS сам подставит --thread-color.
  it('leaves the first strand to the stylesheet', () => {
    expect(threadColorStyle({ strand: 1 })).toBeUndefined();
    expect(threadColorStyle({})).toBeUndefined();
  });

  it('has nothing to style without a thread', () => {
    expect(threadColorStyle(null)).toBeUndefined();
    expect(threadColorStyle(undefined)).toBeUndefined();
  });
});
