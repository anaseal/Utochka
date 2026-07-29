import { clamp } from './clamp';

const HEX_RE = /^#([0-9a-f]{6})$/i;

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export const hexToRgb = (hex: string) => {
  const m = HEX_RE.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

export const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map(c => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('');

// Невалидный hex (не '#rrggbb') отдаём как есть — не наша забота валидировать
// пользовательский ввод здесь, вызывающий код (Header) уже гарантирует формат
// через <input type="color">.
export const hexToRgba = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

export const rgbToHsv = (r: number, g: number, b: number): HSV => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
};

export const hsvToHex = ({ h, s, v }: HSV): string => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
};

// Невалидный hex подменяем белым — та же логика, что раньше жила прямо в ColorPicker:
// сброс SV/Hue стейта на "пустой" цвет лучше, чем падение на невалидном вводе.
export const hexToHsv = (hex: string): HSV => {
  const rgb = hexToRgb(hex) ?? { r: 255, g: 255, b: 255 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
};
