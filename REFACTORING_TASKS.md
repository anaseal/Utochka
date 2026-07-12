# Бэклог рефакторинга

Задачи перечислены в логическом порядке выполнения (от фундамента к точечным
правкам) — см. также «Порядок выполнения» в конце. Каждая самодостаточна:
контекст, затронутые файлы, план, критерии готовности, зависимости. Приоритеты:
**P1** — первопричины хрупкости, **P2** — надёжность, **P3** — производительность,
**P4** — корректность, **P5** — чистота.

Правила проекта (см. [CLAUDE.md](CLAUDE.md)): язык RU; задачи, задевающие
`generator.ts`/геометрию/архитектуру — план и подтверждение до реализации; новые
npm-зависимости — только после обсуждения; после изменения поведения обновлять
[src/spec.md](src/spec.md).

> Обновление: с прошлой версии документа в проекте появилась вторая техника —
> **CrossWeave** (`useCrossWeaveProject.ts`, `crossWeaveGenerator.ts`,
> `crossWeaveMirror.ts`, `CrossWeaveCanvasView.tsx`, `CrossWeaveBeadView.tsx`,
> `CrossWeaveRulers.tsx`, `crossWeaveTheme.ts`). Она написана как отдельный,
> сознательно не связанный с силянкой MVP, но при этом построчно повторяет
> часть паттернов силянки — эти повторы ниже выделены отдельными задачами
> (T4, T5, T6). Также логика, которая раньше жила в `App.tsx` (T3 в старой
> версии документа), с тех пор переехала в `useSilyankaProject.ts` — ссылки
> ниже актуализированы.

---

## T1 — Единый источник схемы ID бисерин (`beadId.ts`) · P1 · 🔴 красная зона · ✅ выполнено

**Факт.** Добавлен `src/utils/beadId.ts` (`BeadRef`, `encode`, `decode`) —
единственное место с регэкспами формата ID. `regrid.ts`, `mirror.ts`,
`stamp.ts`, `floodFill.buildAdjacencyMap` переведены на `decode`/`encode`
вместо локальных регэкспов; `generator.ts` собирает id через `encode`.
Байт-в-байт сверка старой/новой генерации на 6 конфигурациях (разные
width/height/spans/overrides/decorBands/bottomEdge) — id идентичны. `npm test`
(69/69) и `npm run lint` зелёные.

**Проблема (была).** ID кодируют геометрию строкой (`node-r-c`,
`span-edge-r-c-side-bead-i`, `span-edge-top-link-c-bead-i`,
`span-edge-bottom-link-c-bead-i`, `decor-r-k-c`). Строятся в
[generator.ts](src/utils/generator.ts), а разбираются почти идентичными
регэкспами в 4 файлах: [floodFill.ts:7-10](src/utils/floodFill.ts#L7-L10),
[mirror.ts:10-14](src/utils/mirror.ts#L10-L14),
[stamp.ts:37-41](src/utils/stamp.ts#L37-L41),
[regrid.ts:5-8](src/utils/regrid.ts#L5-L8). Пять копий одного знания о формате.
Отдельно: `regrid.shiftId` дублирует не только регэкспы, но и саму
column-математику чётности рядов, уже описанную в `mirror.mirrorBeadId` —
только для сдвига, а не отражения.

**Почему важно.** Любое изменение формата ID требует синхронной правки в 5
местах, компилятор не помогает — рассинхрон проявляется в рантайме как молча
неработающая заливка/зеркало/штамп. Это первопричина хрупкости; T4-T7
дешевеют после неё.

**Файлы.** Новый `src/utils/beadId.ts`; миграция потребителей: `mirror.ts`,
`stamp.ts`, `regrid.ts`, `floodFill.ts`; по возможности `generator.ts` (сборка ID
через `encode`).

**План.**
1. Discriminated union `BeadRef`:
   `{kind:'node',r,c}` | `{kind:'vertEdge',r,c,side,i}` |
   `{kind:'topLink',c,i}` | `{kind:'bottomLink',c,i}` | `{kind:'decor',r,k,c}`.
2. `encode(ref): string` и `decode(id): BeadRef | null` — единственное место с
   регэкспами/шаблонами.
3. Перевести `mirror`/`stamp`/`regrid` на работу со структурой (`decode` →
   преобразование полей → `encode`), убрать локальные регэкспы.
4. `floodFill.buildAdjacencyMap` перевести на `decode` вместо ручного match.
5. `generator.ts` собирает ID через `encode` (аккуратно — красная зона, отдельно
   проверить, что строки байт-в-байт совпадают со старыми).

**Порядок миграции (по возрастанию риска).** `regrid` → `mirror` → `stamp` →
`floodFill` → `generator`. После каждого файла — прогон соответствующих тестов
из T2 (или ручная проверка функции, если T2 ещё не сделан).

**Критерии готовности.**
- Регэкспы формата ID существуют только в `beadId.ts`.
- `switch(kind)` исчерпывающий (компилятор ловит недобавленный тип).
- Заливка, зеркало, штамп, resize-в-mirror, декор-полосы работают как раньше
  (ручная проверка сценариев + T2, если готов).
- ID, генерируемые `generator.ts`, идентичны прежним (важно: в localStorage
  уже лежат старые ID пользователей).

**Зависимости.** Нет. Желательно делать **после** T2 (тесты как страховка), но
T2 можно писать и против текущего кода. Требует плана-подтверждения (задевает
`generator.ts`). CrossWeave не затронут — там один тип бисерины (`bead-r-c`),
собственный простой формат в `crossWeaveMirror.ts`.

---

## T2 — Unit-тесты на чистую геометрию · P2 · ✅ выполнено

**Факт.** 7 test-файлов, 69 тестов, `npm test` зелёный (проверено повторным
прогоном). Покрыты все пункты плана ниже плюс `crossWeaveMirror`/
`crossWeaveGenerator` (не были в исходном плане, т.к. CrossWeave тогда ещё не
было) и `captureStampPattern`/`applyStampPattern` сверх минимального пункта про
`translateBeadId`.

**Проблема.** Тестов почти нет (силяночные `spans`/`mirror`/`stamp`/`regrid`/
`floodFill` покрыты слабо, `crossWeaveMirror`/`crossWeaveGenerator` — не покрыты
вовсе). Самая сложная логика — чистые функции с нетривиальной геометрией
(чётность рядов, sin-дуги, per-row overrides, декор с измерением `k`,
округление `i2 = Math.round(t*(dstCount+1))` в [stamp.ts:112](src/utils/stamp.ts#L112)).

**Почему важно.** Корректность держится на ручной проверке в браузере.
Регрессии в переносе/зеркале не замечаются до жалобы. Страховка для T1 и для
объединения хуков в T4.

**Файлы.** `vitest.config.ts` (уже есть — `npm test` настроен), `*.test.ts` рядом
с утилитами (см. пример [crossWeaveMirror.test.ts](src/utils/crossWeaveMirror.test.ts)).

**План / что покрыть.**
- `spans`: `resolveSpanCount` (чёт/нечёт, override, ключ `-1`), `clampSpan`
  (границы 3–10).
- `mirror`: узлы чётных/нечётных рядов, крайний узел нечётного ряда → `null`,
  верх/низ кромки, декор, обмен `left/right`.
- `stamp.translateBeadId`: перенос по dRow/dCol, кромки роняются при `dRow≠0`,
  округление индекса при разном `srcCount/dstCount`, выход за сетку → `null`.
- `regrid.shiftDesignMapColumns`: сдвиг, отбрасывание вышедших за сетку.
- `floodFill.computeUnifiedFloodFill`: маленькая сетка, растекание сетка↔подвеска
  через якорную ноду, стоп на другом цвете.

**Критерии готовности.** `npm test` зелёный; крайние случаи (границы сетки,
`null`-возвраты) покрыты; тесты выражены в терминах поведения, не реализации.

**Зависимости.** Нет. Делать первой либо параллельно с T1.

---

## T3 — Общая утилита `clamp()` + централизация числовых границ · P5 · ✅ выполнено

**Было.** Паттерн `Math.min(max, Math.max(min, v))` был продублирован без
общей функции в `App.tsx` (zoom), `useSilyankaProject.ts` (spacing ×2),
`useCrossWeaveProject.ts` (spacing ×2) — и, как выяснилось при реализации, ещё и
в `ColorPicker.tsx` (свой локальный `clamp` для HSV).

**Стало.** Добавлен `src/utils/clamp.ts` (`clamp(v, min, max)`), подключён во
всех перечисленных местах; `spans.ts.clampSpan` переписан через него;
`theme.ts` получил `APP_CONSTRAINTS.minZoom/maxZoom/zoomStep`, на них заменены
магические `0.25/3`/`25/300` в `App.tsx` и `Header.tsx`.

**Осталось проверить (не блокирует T4, но стоит сверить перед закрытием).**
- Ручная проверка: zoom-степпер в Header (`min/max` теперь через
  `APP_CONSTRAINTS`), spacing-степперы обеих техник, HSV-пикер цвета — без
  регрессий в границах.
- `npm run lint`/`npm run build` не показывают неиспользуемый импорт в местах,
  где раньше был локальный `clamp` (`ColorPicker.tsx`).

---

## T4 — Общий хук резайза сетки для Silyanka и CrossWeave · P2 · ✅ выполнено

**Факт.** Добавлен `src/utils/gridResize.ts` (`resizeWidthRelative`,
`resizeWidthAbsolute` — чистая mirror-aware арифметика ширины, возвращает
`{newWidth, mirrorDelta}` или `null`, если размер не изменился). Подключён в
обоих хуках: `useSilyankaProject.ts` через общий `applyWidth` (+ снятие
подвесок при сужении/сдвиге — шаг, специфичный только для силянки, оставлен
поверх общей базы) и `useCrossWeaveProject.ts` через свой `applyWidth`.
Очистка `decorBands`/`rowSpanOverrides` внутри `useSilyankaProject.ts`
объединена в `pruneRowsBelow` + общие `applyHeight`/`applySpanEdge`, вызываемые
и из relative-, и из absolute-сеттеров — дублирования между ними больше нет.
`spec.md` обновлён (путь `App.tsx` → `useSilyankaProject.ts`, упоминание
общего `applyHeight`). `npm test` (69/69), `npm run lint`, `npm run build`
зелёные.

**Проблема (была).** Логика «относительный/абсолютный сеттер размера с очисткой
зависимого состояния» продублирована на трёх уровнях:
1. **Внутри `useSilyankaProject.ts` самого с собой:** очистка `decorBands` при
   уменьшении высоты — дословно одинаковый блок в
   [updateDimension('height')](src/hooks/useSilyankaProject.ts#L226-L237) и в
   [setHeightAbsolute](src/hooks/useSilyankaProject.ts#L289-L302); аналогично
   [updateTopSpan](src/hooks/useSilyankaProject.ts#L240-L245)/[setTopSpanAbsolute](src/hooks/useSilyankaProject.ts#L304-L309)
   и bottom-пара — оба зовут `pruneRedundantOverrides`.
2. **Mirror-resize (±2 с центрированием)** — почти построчно совпадает с
   [updateDimension('width')](src/hooks/useSilyankaProject.ts#L201-L216)/[setWidthAbsolute](src/hooks/useSilyankaProject.ts#L262-L282)
   и тем же в
   [useCrossWeaveProject.ts:69-82](src/hooks/useCrossWeaveProject.ts#L69-L82)/[84-104](src/hooks/useCrossWeaveProject.ts#L84-L104) —
   отличается только вызываемая функция сдвига design map
   (`shiftDesignMapColumns` vs `shiftCrossWeaveDesignMapColumns`).

**Почему важно.** Инвариант «при сужении почисти зависимое состояние» размазан
и продублирован дважды в одном файле и один раз между техниками → правишь одну
ветку, забываешь другую (и в силянке, и в CrossWeave разом).

**Файлы.** Новый `src/hooks/useGridResize.ts` (или расширение существующих
хуков общей внутренней функцией); упрощение `useSilyankaProject.ts` и
`useCrossWeaveProject.ts`.

**План.**
1. Базовая функция `resizeWidthMirrorAware(current, delta, mirrorMode, shiftFn)`,
   переиспользуемая для относительного и абсолютного сеттера (абсолютный =
   `resize(width, target - current)`), общая для обеих техник — параметризуется
   только функцией сдвига design map.
2. В `useSilyankaProject.ts` вынести очистку `decorBands`/`rowSpanOverrides` в
   одну internal-функцию, вызываемую из relative- и absolute-сеттеров.
3. Особый случай подвесок при сужении width (только у силянки) — оставить
   отдельным шагом поверх общей базы, с комментарием почему он не общий.

**Критерии готовности.** Нет продублированной логики очистки ни внутри
`useSilyankaProject.ts`, ни между `useSilyankaProject.ts`/`useCrossWeaveProject.ts`;
поведение resize/span (в т.ч. mirror, в обеих техниках) без регрессий.

**Зависимости.** T3 (клампы) уже выполнена — можно начинать сразу. Независима от T1.

---

## T5 — Общая логика `CanvasView.tsx`/`CrossWeaveCanvasView.tsx` · P5 · ✅ выполнено

**Факт.** Добавлены `src/hooks/useWheelZoom.ts` (Ctrl+wheel zoom),
`src/hooks/useMirrorPaint.ts` (`applyPaint` + зеркальная пара, mirror-функция
передаётся замыканием), `src/utils/canvasDim.ts` (`computeCanvasDim`, общий
`margin=30`; подвески силянки передаются через `extraMaxY`), `src/utils/colorStats.ts`
(`computeColorStats` — мутируемый `Map`, силянка доусеивает его подвесками
поверх базового прохода) и `src/components/Editor/CanvasView/CanvasChrome.tsx`
(theme-toggle + export-btn). Оба `CanvasView`/`CrossWeaveCanvasView` переведены
на общие куски; заодно (по тем же строкам) убран спред `Math.max(...beads.map(...))`
в `computeCanvasDim` — частично закрывает T10 (только для `dim`, `paintedBounds`/
`mirrorAxis` в `CrossWeaveCanvasView` не тронуты). `npm run lint`, `npm run build`,
`npm test` (69/69) зелёные. Поведение не менялось — `spec.md` не требует правок.

**Проблема (была).** Оба компонента (434 и 242 строки) повторяли один и тот же набор
кусков логики и разметки:
- wheel-zoom `useEffect` — идентичен:
  [CanvasView.tsx:111-124](src/components/Editor/CanvasView/CanvasView.tsx#L111-L124)
  vs [CrossWeaveCanvasView.tsx:59-72](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L59-L72).
- `dim` (размер SVG, `margin=30`) —
  [CanvasView.tsx:126-149](src/components/Editor/CanvasView/CanvasView.tsx#L126-L149)
  vs [CrossWeaveCanvasView.tsx:74-83](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L74-L83).
- `colorStats` (свод в `Map` по цвету) —
  [CanvasView.tsx:161-175](src/components/Editor/CanvasView/CanvasView.tsx#L161-L175)
  vs [CrossWeaveCanvasView.tsx:85-92](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L85-L92).
- кнопки theme-toggle и export-btn — байт-в-байт одинаковый JSX
  ([CanvasView.tsx:414-432](src/components/Editor/CanvasView/CanvasView.tsx#L414-L432)
  vs [CrossWeaveCanvasView.tsx:221-239](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L221-L239)).
- `applyPaint` (paintBead + поиск зеркальной пары) — тот же паттерн, отличается
  только вызываемая mirror-функция.

**Почему важно.** 5 независимых копий одной и той же не-геометрической
инфраструктуры (zoom, размер холста, статистика, экспорт-кнопки) — правка
одной, скорее всего, требует такой же правки в другой, и это легко упустить,
т.к. компоненты сознательно не являются веткой друг друга.

**Файлы.** Новый `src/hooks/useCanvasChrome.ts` (wheel-zoom + `colorStats` +
theme/export-кнопки как общий presentational-кусок или render-helper);
упрощение обоих `CanvasView.tsx`.

**План.**
1. Вынести wheel-zoom в `useWheelZoom(containerRef, onZoomChange)` — общий хук.
2. Вынести `colorStats`-подсчёт (`beads` + `designMap` + `defaultColorFor`) в
   общую функцию `computeColorStats(items, designMap, defaultColor)`, если типы
   позволяют (бисерины силянки и CrossWeave имеют разные доп.-поля, но общие
   `id`/`type`-подобное).
3. Кнопки theme-toggle/export вынести в общий компонент `CanvasChrome`
   (props: `canvasTheme`, `onToggleCanvasTheme`, `onExport`), рендерящийся в
   обоих `CanvasView`.
4. `dim`-расчёт с общим `margin=30` — общая маленькая функция, специфичные
   добавки (глубина подвесок у силянки) остаются сверху как параметр.

**Критерии готовности.** Wheel-zoom, подсчёт статистики и chrome-кнопки не
продублированы; оба канваса визуально и функционально без регрессий.

**Зависимости.** Нет. Можно делать параллельно с T4.

---

## T6 — Общий «скелет» `BeadView.tsx`/`CrossWeaveBeadView.tsx` · P5

**Проблема.** Оба компонента рендерят одинаковую структуру `<g>` (hitbox →
highlight → body), одинаковые обработчики `onMouseEnter`/`onMouseDown`, ту же
CSS-переменную `--bead-color`; отличаются только формой примитива
(`circle` у силянки, `ellipse` у CrossWeave) и выбором радиуса
(тип бисерины vs ориентация).

**Почему важно.** Небольшое, но точное дублирование — при правке hitbox/highlight
поведения (например, T8 про Pointer Events) придётся синхронно править оба файла.

**Файлы.** `BeadView.tsx`, `CrossWeaveBeadView.tsx`, возможно общий
`BeadShell.tsx`.

**План.** Вынести общий `<g>`-скелет с рендер-пропом/параметром формы
(`shape: { cx, cy, rBody, rHitbox, rHighlight }` — где под капотом рисуется
либо `circle`, либо `ellipse` с `rx=ry=r`), оставить в каждом файле только
вычисление конкретных радиусов из своей темы. Не обязательно объединять в
один компонент — можно оставить два тонких файла поверх общего хелпера.

**Критерии готовности.** Общая часть (структура `<g>`, обработчики, CSS-переменная)
не продублирована; внешний вид/поведение бусин обеих техник не изменились.

**Зависимости.** Нет. Низкий риск, можно делать в любой момент.

---

## T7 — Свернуть 4 цикла min/max в `stamp.captureStampPattern` · P5

**Проблема.** [captureStampPattern:147-167](src/utils/stamp.ts#L147-L167) считает
`anchorRow`/`anchorCol`/`anchorRowBottom`/`anchorColBottom` четырьмя почти
идентичными циклами `for...if(...<...)`.

**Почему важно.** Мелкая, но точная дупликация в красной зоне (штамп завязан на
геометрию сетки) — свести к одному проходу/`reduce` проще поддерживать и меньше
шанс опечатки в одном из четырёх копипаст-циклов.

**Файлы.** `stamp.ts`.

**План.** Один проход по `anchorSource`, накапливающий `{minRow, minColAtMinRow,
maxRow, minColAtMaxRow}` за один `for`, либо явный `reduce`.

**Критерии готовности.** Один проход вместо четырёх; штамп (top/bottom anchor)
работает как раньше — проверить вручную или тестом из T2.

**Зависимости.** Нет.

---

## T8 — Не писать в localStorage на каждую бусину · P3

**Проблема.** [usePersistedState.ts:20-24](src/hooks/usePersistedState.ts#L20-L24) пишет в
`useEffect` при любом изменении состояния. Во время мазка
[useDrawing.ts:98](src/hooks/useDrawing.ts#L98) (`paintBead` → `setDesignMap`)
вызывается на каждом `mouseenter` → синхронный `JSON.stringify(весь designMap)
+ setItem` на каждую бусину при протягивании. Актуально для обеих техник —
`useDrawing` общий.

**Почему важно.** На большой схеме — заметный джанк при рисовании (синхронная
запись на диск каждый кадр мыши).

**Файлы.** `usePersistedState.ts` и/или `useDrawing.ts`.

**План (выбрать одно, обсудить).**
- **A.** Дебаунс записи в `usePersistedState` (напр. 300 мс) — общее решение,
  но задерживает персист всех потребителей.
- **B.** Персистить `designMap` на конце мазка (`stopDrawing`)/через отдельный
  «flush», не на каждый `setDesignMap`. Точечно, но требует различать транзиентные
  и финальные изменения.

Рекомендация: обсудить A vs B; A проще и покрывает все persisted-состояния.

**Критерии готовности.** При протягивании кисти нет `setItem` на каждую бусину;
после паузы/отпускания состояние в localStorage актуально; перезагрузка
восстанавливает рисунок (в обеих техниках).

**Зависимости.** Нет.

---

## T9 — Строить граф смежности один раз · P3

**Проблема.** [computeUnifiedFloodFill](src/utils/floodFill.ts#L161) вызывает
`buildAdjacencyMap(beads)` при каждом клике; в зеркале
[applyUnifiedFloodFill (useSilyankaProject.ts:386-417)](src/hooks/useSilyankaProject.ts#L386-L417)
зовёт его дважды (строки [391-392](src/hooks/useSilyankaProject.ts#L391-L392)) →
два полных пересоздания графа (O(n) + регэксп на бусину) на один клик.

**Почему важно.** Дублированная O(n)-работа без нужды; граф зависит только от
`beads`.

**Файлы.** `floodFill.ts` (сигнатура), `useSilyankaProject.ts` (мемоизация графа
от `beads`).

**План.** Вынести `buildAdjacencyMap` в `useMemo` от `beads` внутри
`useSilyankaProject`, передавать готовый `adjMap` в `computeUnifiedFloodFill`;
убрать внутренний вызов. После T1 — строить на `decode`.

**Критерии готовности.** На один клик заливки (в т.ч. зеркальной) граф строится
максимум один раз на изменение `beads`; заливка без регрессий.

**Зависимости.** Мягко зависит от T1 (декодирование), но выполнима и до неё.

---

## T10 — Убрать спред больших массивов в `Math.max`/`Math.min` · P3

**Частично закрыто в T5.** Спред в расчёте `dim` (бывший
`CanvasView.tsx:128-129`) убран — теперь это `reduce`-проход внутри
`computeCanvasDim` (`src/utils/canvasDim.ts`). Осталось: `paintedBounds`
([CrossWeaveCanvasView.tsx:87-93](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L87-L93))
и `mirrorAxis` ([CrossWeaveCanvasView.tsx:109-110](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L109-L110)) —
не тронуты, т.к. специфичны только для CrossWeave и не были частью
дублирования, вынесенного в T5.

**Проблема (оставшаяся часть).** `Math.min/max(...ys)` в
[CanvasRulers.tsx:155-156](src/components/Editor/CanvasRulers/CanvasRulers.tsx#L155-L156)
и в двух местах `CrossWeaveCanvasView.tsx`, перечисленных выше.

**Почему важно.** На больших сетках массив — тысячи элементов; спред рискует
переполнить стек аргументов и аллоцирует промежуточный `.map`.

**Файлы.** `CanvasView.tsx`, `CrossWeaveCanvasView.tsx`, `CanvasRulers.tsx`.

**План.** Заменить на `reduce` в один проход (без промежуточного массива и спреда).

**Критерии готовности.** Нет `Math.max(...arr)`/`Math.min(...arr)` по массивам
бусин/координат; размеры SVG и оси считаются как раньше.

**Зависимости.** Нет. Можно делать заодно с T5 (там всё равно трогаем эти же куски).

---

## T11 — Исключить `transparent` из спецификации материалов · P4

**Проблема.** `colorStats` в
[CanvasView.tsx:161-175](src/components/Editor/CanvasView/CanvasView.tsx#L161-L175)
берёт `designMap[bead.id] || defaultColorFor(...)`, а `defaultColorFor`
возвращает `'transparent'` ([theme.ts:47-48](src/config/theme.ts#L47-L48)).
Незакрашенные бусины попадают в статистику и в PNG-легенду как
`transparent × N`. То же самое устройство теперь и в
[CrossWeaveCanvasView.tsx:85-92](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L85-L92)
(`defaultColorForCrossWeave`).

**Почему важно.** `CanvasStats` — «реальная спецификация материалов» (что купить).
Непокрашенная бусина не материал; она искажает разбивку по цветам, общий счётчик
и легенду в экспорте — в обеих техниках.

**Файлы.** `CanvasView.tsx`, `CrossWeaveCanvasView.tsx` (`colorStats`, возможно
`totalCount`), проверить [exportScheme.ts](src/utils/exportScheme.ts) (легенда)
и `CanvasStats.tsx`.

**Решение обсудить.** Считать материалом только реально покрашенные бусины
(отбрасывать `transparent`). Уточнить, должен ли `Total Count` считать все бусины
или только покрашенные — вероятно, оставить общее число бусин, но разбивку по
цветам — только по покрашенным.

**Критерии готовности.** В `CanvasStats` и в экспортируемой легенде нет
`transparent`-бакета (в обеих техниках); поведение согласовано между экраном и
PNG; обновлён [spec.md](src/spec.md), если меняется смысл счётчиков.

**Зависимости.** Мягко стыкуется с T5 (там `colorStats` всё равно обобщается).

---

## T12 — Pointer Events на холсте (тач-поддержка) · P4

**Проблема.** Рисование на mouse-событиях:
[CanvasView.tsx:333-336](src/components/Editor/CanvasView/CanvasView.tsx#L333-L336),
[BeadView.tsx:39-40](src/components/Editor/BeadView/BeadView.tsx#L39-L40),
[CrossWeaveCanvasView.tsx:169-172](src/components/Editor/CanvasView/CrossWeaveCanvasView.tsx#L169-L172),
[CrossWeaveBeadView.tsx:40-41](src/components/Editor/BeadView/CrossWeaveBeadView.tsx#L40-L41),
[PendantLayer.tsx](src/components/Editor/PendantLayer/PendantLayer.tsx). Сайдбар
при этом уже на Pointer Events.

**Почему важно.** На планшете/тач-экране покраска не работает; модель ввода
несогласованна. Актуально для обеих техник разом — стоит делать одним заходом.

**Файлы.** `CanvasView.tsx`, `CrossWeaveCanvasView.tsx`, `BeadView.tsx`,
`CrossWeaveBeadView.tsx`, `PendantLayer.tsx`.

**План.** Перевести покраску на `onPointerDown/onPointerEnter` (+ `touch-action`
для отмены скролла при рисовании). Аккуратно с наведением-покраской: на тач нет
hover — рисование ведётся по «pointer down + move», возможно через
`setPointerCapture` и hit-test координат. Если делать после T6 — правится в одном
общем месте вместо четырёх файлов.

**Критерии готовности.** Рисование/стирание/заливка работают мышью и пальцем;
на десктопе поведение без регрессий (в обеих техниках).

**Зависимости.** Дешевле после T6 (общий `BeadView`-скелет). Средний объём —
уточнить, нужна ли тач-поддержка сейчас.

---

## T13 — Явные пропсы вместо `{...drawingControls}` · P4

**Проблема.** [App.tsx:207](src/App.tsx#L207) разворачивает весь возврат
`useDrawing` в пропсы `CanvasView`, тогда как `CanvasViewProps` объявляет лишь
часть.

**Почему важно.** Лишние поля протекают молча; переименование поля хука ломается
без ошибки типов; неясно, что реально нужно компоненту.

**Файлы.** `App.tsx`, `CanvasView.tsx`.

**План.** Передать явные пропсы, либо единый типизированный объект
`drawing={drawingControls}` c соответствующим типом в `CanvasViewProps`.

**Критерии готовности.** Нет спреда всего хука; TypeScript ловит несоответствие
имён пропсов.

**Зависимости.** Нет.

---

## T14 — Именованные сентинелы рядов и сигнатура `mirrorBeadId` · P5

**Проблема.** `rowSpanOverrides[-1]` = верхняя кромка ([generator.ts:26](src/utils/generator.ts#L26))
— магический индекс, разделяемый через комментарии между `generator.ts`,
`CanvasRulers.tsx` и `useSilyankaProject.ts`. Отдельно:
`mirrorBeadId(id, width, internalTop, internalBottom?)` — непоследовательная
опциональность ([mirror.ts:19-24](src/utils/mirror.ts#L19-L24)), хотя все вызовы
передают оба аргумента.

**Почему важно.** Неочевидная связь между модулями; легко сломать при
рефакторинге спанов. Мелкий запашок API.

**Файлы.** `theme.ts`/`spans.ts` (константа `TOP_EDGE_ROW=-1`), потребители;
`mirror.ts` (сигнатура).

**План.** Ввести именованную константу вместо `-1`; выровнять сигнатуру
`mirrorBeadId` (оба internal-параметра обязательны).

**Критерии готовности.** Нет «голого» `-1` как индекса кромки; сигнатура
`mirrorBeadId` единообразна.

**Зависимости.** Стыкуется с T1 (там же переезжает трактовка кромок).

---

## Порядок выполнения (рекомендация)

1. ~~**T3** (`clamp()`)~~ — ✅ выполнено.
2. ~~**T2** (тесты)~~ — ✅ выполнено, страховка готова.
3. ~~**T1** (`beadId.ts`)~~ — ✅ выполнено.
4. ~~**T4**~~ (общий resize-хук, обе техники) — ✅ выполнено.
5. ~~**T5**~~ (общая логика канваса между техниками) — ✅ выполнено. **T6**
   (общий скелет бусин между техниками) — независима, можно делать в любой момент.
6. **T7** — мелкая точечная правка внутри стемпа, в любой момент.
7. **T9, T10, T8** (производительность) — T9 удобнее после T1.
8. **T11, T13, T14** — быстрые точечные правки.
9. **T12** (тач) — дешевле после T6, по потребности отдельно.
