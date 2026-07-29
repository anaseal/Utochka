import { describe, it, expect } from 'vitest';
import { weaveLabelTransform } from './weaveView';

describe('weaveLabelTransform', () => {
  it('returns undefined when the canvas is neither rotated nor flipped (no counter-transform needed)', () => {
    expect(weaveLabelTransform(false, false)).toBeUndefined();
  });

  it('flip only: mirrors around the vertical line through the anchor point', () => {
    const transform = weaveLabelTransform(false, true)!;
    expect(transform(5, 10)).toBe('translate(10 0) scale(-1 1)');
  });

  it('rotate only: applies the inverse rotate(90) around the anchor point', () => {
    const transform = weaveLabelTransform(true, false)!;
    expect(transform(5, 10)).toBe('rotate(90 5 10)');
  });

  it('both: composes flip then rotate, in that order', () => {
    const transform = weaveLabelTransform(true, true)!;
    expect(transform(5, 10)).toBe('translate(10 0) scale(-1 1) rotate(90 5 10)');
  });
});
