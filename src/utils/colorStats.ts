import { effectiveBeadColor } from '../config/theme';

// Свод количества бисерин по цвету — общий для CanvasView и
// CrossWeaveCanvasView. Возвращает мутируемый Map (не массив), чтобы
// вызывающий код мог доусеять его дополнительными источниками (например,
// подвесками у силянки) поверх базового прохода по beads.
//
// Прозрачные бисерины падают в тот же бакет, что и незакрашенные (см.
// effectiveBeadColor): это одно и то же состояние изделия, и строка
// `transparent` в спецификации как раз и означает «столько прозрачного
// бисера». Две отдельные строки читались бы как два разных материала.
export const computeColorStats = <T extends { id: string }>(
  items: readonly T[],
  designMap: Record<string, string>,
  defaultColorOf: (item: T) => string,
): Map<string, number> => {
  const stats = new Map<string, number>();
  items.forEach((item) => {
    const color = effectiveBeadColor(designMap[item.id], defaultColorOf(item));
    stats.set(color, (stats.get(color) || 0) + 1);
  });
  return stats;
};
