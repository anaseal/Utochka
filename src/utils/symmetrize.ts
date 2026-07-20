// Ретроактивная симметризация Design Map: для каждой закрашенной бисерины
// без зеркальной пары в карте — дозаполняет пару тем же цветом. Уже
// закрашенные (в том числе конфликтующим цветом) зеркальные пары не трогает —
// функция только заполняет отсутствующую половину, а не приводит обе стороны
// к единому цвету. Не зависит от типа сетки — конкретную формулу зеркала
// (mirrorBeadId / mirrorCrossWeaveBeadId) передаёт вызывающий код.
export const fillMissingMirror = (
  map: Record<string, string>,
  mirrorFn: (id: string) => string | null,
): Record<string, string> => {
  let changed = false;
  const next = { ...map };
  for (const [id, color] of Object.entries(map)) {
    const mirrorId = mirrorFn(id);
    if (mirrorId === null || mirrorId === id || mirrorId in next) continue;
    next[mirrorId] = color;
    changed = true;
  }
  return changed ? next : map;
};
