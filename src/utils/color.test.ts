import { describe, it, expect } from 'vitest';
import { hexToRgba, hexToRgb, rgbToHex, rgbToHsv, hsvToHex, hexToHsv } from './color';

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

describe('hexToRgb', () => {
  it('parses a hex color', () => {
    expect(hexToRgb('#e2d6bb')).toEqual({ r: 226, g: 214, b: 187 });
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#E2D6BB')).toEqual({ r: 226, g: 214, b: 187 });
  });

  it('returns null for invalid input', () => {
    expect(hexToRgb('not-a-color')).toBeNull();
    expect(hexToRgb('#fff')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('formats rgb as hex', () => {
    expect(rgbToHex(226, 214, 187)).toBe('#e2d6bb');
  });

  it('clamps out-of-range and rounds fractional components', () => {
    expect(rgbToHex(-10, 300, 127.6)).toBe('#00ff80');
  });
});

describe('rgbToHsv', () => {
  it('converts primary colors', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 1, v: 1 });
    expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 1, v: 1 });
    expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 1, v: 1 });
  });

  it('treats grayscale as zero saturation', () => {
    expect(rgbToHsv(128, 128, 128)).toEqual({ h: 0, s: 0, v: 128 / 255 });
  });

  it('handles black', () => {
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
  });
});

describe('hsvToHex', () => {
  it('converts primary hues back to hex', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#ff0000');
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00');
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000ff');
  });

  it('converts zero saturation to grayscale', () => {
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#ffffff');
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000');
  });
});

describe('hexToHsv', () => {
  it('round-trips through rgbToHsv', () => {
    expect(hexToHsv('#ff0000')).toEqual(rgbToHsv(255, 0, 0));
  });

  it('falls back to white for invalid hex', () => {
    expect(hexToHsv('not-a-color')).toEqual({ h: 0, s: 0, v: 1 });
  });
});
