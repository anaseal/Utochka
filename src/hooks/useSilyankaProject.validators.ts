import { APP_CONSTRAINTS, BEAD_THEME } from '../config/theme';
import { BottomEdgeDecor, EdgeExtension, GridConfig, Taper, TaperSide } from '../types/bead';
import { PendantPlacement, PendantChain, DecorTailPlacement } from '../types/pendant';
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
export const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

export const isTaperSide = (v: unknown): v is TaperSide =>
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

export const isRowSpanOverrides = (v: unknown): v is Record<number, number> => {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every(n => typeof n === 'number');
};

// decorBands имеет ту же форму, что и rowSpanOverrides: Record<row, count>.
export const isDecorBands = isRowSpanOverrides;

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

export const isPendantPlacements = (v: unknown): v is PendantPlacement[] =>
  Array.isArray(v) && v.every(p =>
    typeof p === 'object' && p !== null &&
    typeof p.placementId === 'string' &&
    typeof p.templateId === 'string' &&
    typeof p.col === 'number' &&
    typeof p.colorMap === 'object' && p.colorMap !== null);

export const isPendantChains = (v: unknown): v is PendantChain[] =>
  Array.isArray(v) && v.every(c =>
    typeof c === 'object' && c !== null &&
    typeof c.placementId === 'string' &&
    typeof c.startCol === 'number' &&
    typeof c.endCol === 'number' &&
    typeof c.colorMap === 'object' && c.colorMap !== null);

export const isDecorTailPlacements = (v: unknown): v is DecorTailPlacement[] =>
  Array.isArray(v) && v.every(t =>
    typeof t === 'object' && t !== null &&
    typeof t.placementId === 'string' &&
    typeof t.col === 'number' &&
    typeof t.rows === 'number' &&
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
