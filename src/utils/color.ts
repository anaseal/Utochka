const HEX_RE = /^#([0-9a-f]{6})$/i;

// Невалидный hex (не '#rrggbb') отдаём как есть — не наша забота валидировать
// пользовательский ввод здесь, вызывающий код (Header) уже гарантирует формат
// через <input type="color">.
export const hexToRgba = (hex: string, alpha: number): string => {
  const m = HEX_RE.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
