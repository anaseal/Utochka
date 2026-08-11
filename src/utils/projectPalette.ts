/* FILE: src\utils\projectPalette.ts */

// Извлечение палитры из уже нарисованного проекта: собирает цвета, которыми
// пользователь реально красил, и считает, сколько бисерин каждого.
//
// Источник — не бисерины сетки, а карты цветов (designMap + colorMap подвесок,
// цепочек, хвостов, зубцов). Так расчёт не зависит от геометрии и остаётся
// дешёвым: обход идёт по числу закрашенных бисерин, а не по всей сетке. Это
// сознательно НЕ та же выборка, что сводка материалов в CanvasStats
// (computeColorStats): там считаются все бисерины изделия, включая
// незакрашенные (бакет `transparent`) — здесь же нужны только цвета, годные
// для слота палитры.
//
// Отсюда и фильтр: в палитру попадает только `#rrggbb`. Прозрачный бисер
// (CLEAR_BEAD_COLOR = '#ffffff00', 8 знаков) отсеивается тем же условием —
// палитра его не принимает (см. isPaletteColors ниже), и ставится он
// отдельной кнопкой в пикере, а не свотчем.

const HEX_RE = /^#[0-9a-f]{6}$/i;

/**
 * Годен ли массив на роль палитры приложения (`app:palette`). Один валидатор
 * на двоих: им проверяет прочитанное из localStorage `useAppSettings`, и им же
 * — палитру из записи проекта библиотека (projectLibrary.ts). Разъедься они,
 * библиотека могла бы записать палитру, которую настройки при чтении молча
 * откатят к DEFAULT_PALETTE.
 */
export const isPaletteColors = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every(c => typeof c === 'string' && HEX_RE.test(c));

/**
 * Карта «ключ бисерины → цвет». `designMap` ключуется строкой (bead.id),
 * colorMap подвесок/цепочек/хвостов/зубцов — числовым индексом; для подсчёта
 * цветов ключ роли не играет, поэтому принимаем оба вида.
 */
export type ColorSource = Record<string, string> | Record<number, string>;

/**
 * @param sources Карты цветов проекта в любом порядке; `undefined`-элементы
 *   пропускаются, чтобы вызывающий код мог собирать список без ветвлений.
 * @returns Пары `[цвет, количество]`, отсортированные по убыванию количества
 *   (при равенстве — по hex, чтобы порядок не «прыгал» между рендерами).
 *   Цвета нормализованы к нижнему регистру: `#FF4757` и `#ff4757` — один
 *   материал, двумя строками они читались бы как два разных.
 */
export const extractProjectColors = (
  sources: readonly (ColorSource | undefined)[],
): [string, number][] => {
  const counts = new Map<string, number>();

  sources.forEach((source) => {
    if (!source) return;
    // Ключи здесь не нужны, а Object.values не принимает Record<number, ...>
    // напрямую — приводим к строковому индексу (в рантайме ключи объекта
    // строковые в обоих случаях).
    Object.values(source as Record<string, string>).forEach((color) => {
      if (!HEX_RE.test(color)) return;
      const normalized = color.toLowerCase();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
  });

  return Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
};

/**
 * Собирает источники цветов техники в один список: сетка плюс группы объектов
 * со своей картой цветов (у силянки — подвески, цепочки, декор-хвосты, зубцы).
 *
 * Группы НЕ фильтруются по «живому» якорю, в отличие от сводки материалов
 * (usePendantStats): та отвечает на «сколько бисера купить», и оторвавшаяся
 * подвеска туда не должна попадать, а здесь вопрос другой — «какими цветами
 * нарисована схема», и цвет остаётся цветом схемы независимо от якоря.
 */
export const collectColorSources = (
  designMap: Record<string, string>,
  ...groups: readonly (readonly { colorMap: Record<number, string> }[])[]
): ColorSource[] => [designMap, ...groups.flat().map(item => item.colorMap)];
