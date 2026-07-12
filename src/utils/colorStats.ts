// Свод количества бисерин по цвету — общий для CanvasView и
// CrossWeaveCanvasView. Возвращает мутируемый Map (не массив), чтобы
// вызывающий код мог доусеять его дополнительными источниками (например,
// подвесками у силянки) поверх базового прохода по beads.
export const computeColorStats = <T extends { id: string }>(
  items: T[],
  designMap: Record<string, string>,
  defaultColorOf: (item: T) => string,
): Map<string, number> => {
  const stats = new Map<string, number>();
  items.forEach((item) => {
    const color = designMap[item.id] || defaultColorOf(item);
    stats.set(color, (stats.get(color) || 0) + 1);
  });
  return stats;
};
