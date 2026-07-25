import { describe, it, expect } from 'vitest';
import { hexToRgba } from './color';

describe('hexToRgba', () => {
  it('converts a hex color with full opacity', () => {
    expect(hexToRgba('#e2d6bb', 1)).toBe('rgba(226, 214, 187, 1)');
  });

  it('applies fractional alpha', () => {
    expect(hexToRgba('#22d3ee', 0.5)).toBe('rgba(34, 211, 238, 0.5)');
  });

  it('is case-insensitive on the hex digits', () => {
    expect(hexToRgba('#E2D6BB', 0.85)).toBe('rgba(226, 214, 187, 0.85)');
  });

  it('handles pure black and white', () => {
    expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    expect(hexToRgba('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('returns invalid input unchanged', () => {
    expect(hexToRgba('not-a-color', 1)).toBe('not-a-color');
    expect(hexToRgba('#fff', 1)).toBe('#fff');
  });
});
