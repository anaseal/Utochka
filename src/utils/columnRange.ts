// Единая формула границ колонок узлового ряда — общий источник правды для
// generator.ts, mirror.ts и regrid.ts, чтобы EdgeExtension не расходился между
// модулями. Сужение концов (Taper) здесь НЕ учитывается: оно применяется
// позиционным фильтром в generator.ts уже после построения сетки (режет и
// SPAN-бусины, чтобы конец сходился в острый кончик), а не сдвигом границ
// колонок. Зеркало/regrid работают по полной сетке, а отсутствие обрезанных
// тейпером бусин обрабатывается проверкой существования (beadIds.has).

const isShiftedRow = (r: number): boolean => r % 2 !== 0;

export const getColumnRange = (
  r: number,
  width: number,
  extendLeft: boolean,
  extendRight: boolean,
): { minC: number; maxC: number } => {
  const baseMinC = isShiftedRow(r) && extendLeft ? -1 : 0;
  const baseMaxC = isShiftedRow(r) && !extendRight ? width - 2 : width - 1;
  return { minC: baseMinC, maxC: baseMaxC };
};
