import { APP_CONSTRAINTS, BEAD_THEME } from '../config/theme';
import { BottomEdgeDecor, EdgeExtension, GridConfig, Taper, TaperSide } from '../types/bead';
import { PendantPlacement, PendantChain, DecorTailPlacement, ToothPlacement } from '../types/pendant';
import { Thread } from '../types/thread';
import { resolveSpanCount } from '../utils/spans';

// Целое в границах [min, max] — тот же приём, что isCount ниже (NaN не
// проходит typeof + isInteger), но с диапазоном: без него ширина/высота/
// spacing/spans, пришедшие из localStorage, файла проекта или Share-ссылки,
// обходили ограничение степперов и вешали браузер на том же значении, на
// котором степперы уже не пускают дальше. Используется и в
// useCrossWeaveProject.ts для тех же полей CrossWeaveGridConfig.
export const isIntInRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

// Сырые пределы под панельные APP_CONSTRAINTS.maxGridWidth/maxGridHeight —
// с тем же сдвигом, что и во View (App.tsx: gridWidth = gridSize.width - 1,
// gridHeight = gridSize.height + 1, см. комментарий там же).
export const MAX_RAW_WIDTH = APP_CONSTRAINTS.maxGridWidth + 1;
export const MAX_RAW_HEIGHT = APP_CONSTRAINTS.maxGridHeight - 1;

export const isGridConfig = (v: unknown): v is GridConfig => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  const { minSpan, maxSpan, minSpacing, maxSpacing } = BEAD_THEME.constraints;
  if (!isIntInRange(obj.width, 1, MAX_RAW_WIDTH)) return false;
  if (!isIntInRange(obj.height, 1, MAX_RAW_HEIGHT)) return false;
  if (!isIntInRange(obj.spacing, minSpacing, maxSpacing)) return false;
  if (!isIntInRange(obj.topSpan, minSpan, maxSpan)) return false;
  if (!isIntInRange(obj.bottomSpan, minSpan, maxSpan)) return false;
  return true;
};

export const isBottomEdgeDecor = (v: unknown): v is BottomEdgeDecor =>
  typeof v === 'object' && v !== null &&
  typeof (v as BottomEdgeDecor).enabled === 'boolean';

export const isEdgeExtension = (v: unknown): v is EdgeExtension =>
  typeof v === 'object' && v !== null &&
  typeof (v as EdgeExtension).left === 'boolean' &&
  typeof (v as EdgeExtension).right === 'boolean';

// Целое неотрицательное. Строго, а не просто `typeof === 'number'`: NaN из
// повреждённого файла проекта или Share-ссылки протекал в срез и обнулял
// сравнения в generator.ts — на холсте не оставалось НИ ОДНОЙ бисерины.
const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

const isTaperSide = (v: unknown): v is TaperSide =>
  typeof v === 'object' && v !== null && isCount((v as TaperSide).rows);

export const isTaper = (v: unknown): v is Taper =>
  typeof v === 'object' && v !== null &&
  isTaperSide((v as Taper).top) && isTaperSide((v as Taper).bottom) &&
  isCount((v as Taper).depth);

// rows — сколько узловых рядов половины может занимать скос (+1, чтобы можно
// было свести конец в точку). depth — общий для top/bottom пол ширины в
// половинках колонки (см. types/bead.ts), поэтому его потолок — width-1: на
// нём полотно уже сведено к одной колонке по всей длине, и дальше степпер
// менял бы только число на экране (см. spec.md).
export const taperRowsMax = (height: number): number => height + 1;

export const taperDepthMax = (width: number): number => Math.max(0, width - 1);

export const clampTaperSide = (side: TaperSide, height: number): TaperSide => ({
  rows: Math.max(0, Math.min(side.rows, taperRowsMax(height))),
});

export const clampTaperDepth = (depth: number, width: number): number =>
  Math.max(0, Math.min(depth, taperDepthMax(width)));

// Значения — те же спаны, что и общие topSpan/bottomSpan: per-row override
// подставляется вместо них в resolveSpanCount и больше нигде не
// ограничивается (clampSpan в useGridConfig держит только шаг степпера, не
// то, что пришло из localStorage/файла/Share-ссылки). Без диапазона сюда
// протекали два разных сбоя: большое число раздувало getInternalCount, и
// дуга спана уходила в цикл на миллиард итераций — вкладку вешало намертво,
// ErrorBoundary такое не ловит; NaN делал getYStep нечисловым, и на холсте
// не оставалось ни одной бисерины (тот же итог, что описан у isCount).
// Ключи не проверяем — это номера рядов, включая -1/-2 горизонтальных
// цепочек, и лишний ряд мимо resolveSpanCount безвреден.
export const isRowSpanOverrides = (v: unknown): v is Record<number, number> => {
  if (typeof v !== 'object' || v === null) return false;
  const { minSpan, maxSpan } = BEAD_THEME.constraints;
  return Object.values(v).every(n => isIntInRange(n, minSpan, maxSpan));
};

// Форма та же, что у rowSpanOverrides (Record<row, count>), но диапазон свой
// — число рядов декор-полосы, а не спан, поэтому отдельная функция, а не
// псевдоним. getDecorRows в generator.ts уже отбивает NaN, отрицательные и
// дробные; незакрытым оставалось большое число — оно так же уводит сборку
// полосы в бесконечный цикл.
export const isDecorBands = (v: unknown): v is Record<number, number> => {
  if (typeof v !== 'object' || v === null) return false;
  const { minRows, maxRows } = BEAD_THEME.decorDefaults;
  return Object.values(v).every(n => isIntInRange(n, minRows, maxRows));
};

// Убирает per-row override'ы, совпавшие с глобальным дефолтом.
// Иначе такой override «протухает»: resolveSpanCount отдаёт ему приоритет
// через `??`, и общий контрол TOP/BOTTOM EDGE перестаёт двигать этот ряд.
export const pruneRedundantOverrides = (
  overrides: Record<number, number>,
  topSpan: number,
  bottomSpan: number,
): Record<number, number> => {
  const next: Record<number, number> = {};
  let changed = false;
  for (const [k, v] of Object.entries(overrides)) {
    const r = Number(k);
    if (v === resolveSpanCount(r, topSpan, bottomSpan, {})) {
      changed = true;
      continue;
    }
    next[r] = v;
  }
  return changed ? next : overrides;
};

// Убирает записи с рядами >= limit — используется при сужении высоты, чтобы
// снять decor-полосы/overrides с исчезнувших рядов.
export const pruneRowsBelow = (
  map: Record<number, number>,
  limit: number,
): Record<number, number> => {
  const next: Record<number, number> = {};
  for (const [k, v] of Object.entries(map)) {
    if (Number(k) < limit) next[Number(k)] = v;
  }
  return next;
};

// Якорь подвески — {kind:'grid', col} либо {kind:'tooth', placementId,
// beadIndex}, см. PendantAnchor в types/pendant.ts.
const isPendantAnchor = (v: unknown): boolean => {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  if (a.kind === 'grid') return typeof a.col === 'number';
  if (a.kind === 'tooth') return typeof a.placementId === 'string' && typeof a.beadIndex === 'number';
  return false;
};

// anchor — актуальный формат крепления; col — формат ДО появления зубца-якоря
// (плоская колонка нижнего ряда). Принимаем оба, чтобы не терять подвески,
// сохранённые прежней версией (localStorage, история Undo/Redo, файл
// проекта — все читают этот же валидатор) — перенос col → anchor происходит
// один раз при загрузке, см. normalizePendantPlacements ниже и её
// использование в useSilyankaProject.ts.
export const isPendantPlacements = (v: unknown): v is PendantPlacement[] =>
  Array.isArray(v) && v.every(p =>
    typeof p === 'object' && p !== null &&
    typeof p.placementId === 'string' &&
    typeof p.templateId === 'string' &&
    (isPendantAnchor(p.anchor) || typeof p.col === 'number') &&
    typeof p.colorMap === 'object' && p.colorMap !== null);

// Переносит подвески старого формата (плоский col) в anchor:{kind:'grid',
// col} — единственная точка правды, применяется и к «живому» реестру
// подвесок, и к любому снимку истории Undo/Redo, который его заменяет (см.
// setPendantPlacements в useSilyankaProject.ts). Уже перенесённые записи
// возвращаются как есть (без лишнего копирования).
export const normalizePendantPlacements = (placements: PendantPlacement[]): PendantPlacement[] =>
  placements.map(raw => {
    const p = raw as PendantPlacement & { col?: number };
    if (p.anchor) return p;
    const { col, ...rest } = p;
    return { ...rest, anchor: { kind: 'grid' as const, col: col! } };
  });

// Конец цепочки — узел сетки ({kind:'grid', col}) либо узел зубца
// ({kind:'tooth', placementId, beadIndex}), см. ChainEndpoint в
// types/pendant.ts.
const isChainEndpoint = (v: unknown): boolean => {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  if (e.kind === 'grid') return typeof e.col === 'number';
  if (e.kind === 'tooth') return typeof e.placementId === 'string' && typeof e.beadIndex === 'number';
  return false;
};

export const isPendantChains = (v: unknown): v is PendantChain[] =>
  Array.isArray(v) && v.every(c =>
    typeof c === 'object' && c !== null &&
    typeof c.placementId === 'string' &&
    isChainEndpoint(c.start) &&
    isChainEndpoint(c.end) &&
    typeof c.colorMap === 'object' && c.colorMap !== null);

export const isDecorTailPlacements = (v: unknown): v is DecorTailPlacement[] =>
  Array.isArray(v) && v.every(t =>
    typeof t === 'object' && t !== null &&
    typeof t.placementId === 'string' &&
    typeof t.col === 'number' &&
    typeof t.rows === 'number' &&
    typeof t.colorMap === 'object' && t.colorMap !== null);

export const isTeeth = (v: unknown): v is ToothPlacement[] =>
  Array.isArray(v) && v.every(t =>
    typeof t === 'object' && t !== null &&
    typeof t.placementId === 'string' &&
    typeof t.startCol === 'number' &&
    typeof t.endCol === 'number' &&
    typeof t.colorMap === 'object' && t.colorMap !== null);

export const isThreads = (v: unknown): v is Thread[] =>
  Array.isArray(v) && v.every(t =>
    typeof t === 'object' && t !== null &&
    typeof (t as Thread).id === 'string' &&
    Array.isArray((t as Thread).beadIds) &&
    (t as Thread).beadIds.every(id => typeof id === 'string'));

// Удалённые кликом бисерины (инструмент «Hole», GridSidebar) — id -> true.
// Структурная, не «рисовальная» правка (как taper/rowSpanOverrides): не через
// историю Undo/Redo рисования, переживает Clear All.
export const isDeletedBeads = (v: unknown): v is Record<string, true> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(x => x === true);
};

export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export const isOpacity = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1;
