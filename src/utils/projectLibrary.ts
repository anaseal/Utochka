// Библиотека нескольких проектов — именованные снимки текущей работы,
// между которыми можно переключаться внутри одной техники (см. spec.md,
// «Библиотека проектов»). Живёт в IndexedDB (не в localStorage — общий
// лимит localStorage ~5-10MB делится между всеми проектами разом, а тут
// ещё и миниатюры). Тот же нативный IndexedDB-приём, что и в
// src/utils/referenceImageDb.ts, без новых npm-зависимостей.
//
// Что именно попадает в снимок: ключи localStorage с префиксом `${technique}:`
// (та же единица, что режет collectKeysWithPrefix/applyKeysWithPrefix в
// projectFile.ts) — но НЕ `app:`-ключи целиком (zoom, тема холста и т.п. — это
// настройки приложения, а не свойства конкретной схемы, переключение проекта
// их не должно менять). Исключений из этого правила два, и оба вынимаются и
// вливаются отдельным кодом (readViewState/writeViewState, readPalette/
// writePalette), не общим prefix-сканом:
//   * поворот/отражение полотна (orientation/flipped) — свойство формы сетки
//     (см. комментарий в useWeaveModePanel.ts), но лежит под
//     `app:weaveOrientation`/`app:weaveFlip` как объект по всем техникам сразу;
//   * палитра (`app:palette`) — цвета подбираются под конкретную схему (для
//     того и вкладка Project в пикере, см. utils/projectPalette.ts), поэтому
//     переключение проекта должно приносить его палитру, а не оставлять цвета
//     от предыдущего. Ключ общий на все техники, per-technique среза у него
//     нет — пишется целиком.
//
// "Текущая работа" (то, что сейчас лежит в localStorage под `${technique}:`)
// сама библиотекой не является — это черновик, который пользователь явно
// сохраняет как проект (saveNewProject/updateActiveProject). Загрузка проекта
// (loadProject) заменяет этот черновик и требует перезагрузки страницы —
// тот же паттерн, что уже применяют импорт файла и Share-ссылка
// (см. useProjectIO.ts), а не «горячее» переключение состояния хуков.

import { Technique, CanvasOrientation } from '../components/Editor/Header/Header.types';
import { collectKeysWithPrefix, applyKeysWithPrefix } from './projectFile';
import { isPaletteColors } from './projectPalette';

const DB_NAME = 'silyanka-projects';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const TECHNIQUE_INDEX = 'technique';
const RECORD_VERSION = 1;

const ACTIVE_ID_KEY = 'app:activeLibraryProjectId';
const ORIENTATION_KEY = 'app:weaveOrientation';
const FLIP_KEY = 'app:weaveFlip';
const PALETTE_KEY = 'app:palette';

export interface ProjectRecord {
  id: string;
  version: number;
  technique: Technique;
  name: string;
  savedAt: string;
  updatedAt: string;
  /** Снимок ключей `${technique}:*` из localStorage — та же форма, что и ProjectFile.localStorage. */
  data: Record<string, string>;
  orientation?: CanvasOrientation;
  flipped?: boolean;
  /**
   * Палитра, с которой рисовали схему (`app:palette`). `undefined` — у записей,
   * сохранённых до того, как палитра стала частью снимка: у них палитры нет, и
   * загрузка такого проекта оставляет текущую (см. writePalette).
   */
  palette?: string[];
  /** PNG-превью (captureSchemeThumbnail) или null, если растеризация не удалась/холст пуст. */
  thumbnail: Blob | null;
  /** Автосейв выключен по умолчанию — поле пишется только при явном включении, отсутствие/`undefined` = выключено. */
  autosaveEnabled?: boolean;
}

/** По умолчанию (поле не задано) автосейв выключен — включить можно только явно, см. setAutosaveEnabled. */
export const isAutosaveEnabled = (project: Pick<ProjectRecord, 'autosaveEnabled'>): boolean =>
  project.autosaveEnabled === true;

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex(TECHNIQUE_INDEX, 'technique', { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const putRecord = async (record: ProjectRecord): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getRecord = async (id: string): Promise<ProjectRecord | undefined> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as ProjectRecord | undefined);
    request.onerror = () => reject(request.error);
  });
};

/** Список проектов данной техники, свежеобновлённые сначала. */
export const listProjects = async (technique: Technique): Promise<ProjectRecord[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index(TECHNIQUE_INDEX).getAll(technique);
    request.onsuccess = () => {
      const records = request.result as ProjectRecord[];
      records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  const record = await getRecord(id);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (record && getActiveProjectId(record.technique) === id) clearActiveProjectId(record.technique);
};

export const renameProject = async (id: string, name: string): Promise<void> => {
  const record = await getRecord(id);
  if (!record) return;
  await putRecord({ ...record, name });
};

/** Персональная настройка проекта — не трогает других записей и не требует, чтобы проект был активным. */
export const setAutosaveEnabled = async (id: string, enabled: boolean): Promise<void> => {
  const record = await getRecord(id);
  if (!record) return;
  await putRecord({ ...record, autosaveEnabled: enabled });
};

export const duplicateProject = async (id: string, name: string): Promise<ProjectRecord> => {
  const record = await getRecord(id);
  if (!record) throw new Error('Project not found');
  const now = new Date().toISOString();
  const copy: ProjectRecord = { ...record, id: crypto.randomUUID(), name, savedAt: now, updatedAt: now };
  await putRecord(copy);
  return copy;
};

// Указатель "какой снимок сейчас открыт в этой технике" — обычный
// localStorage-ключ (Partial<Record<Technique, string>>), не usePersistedState:
// его пишет loadProject прямо перед window.location.reload() (см. useProjectLibrary.ts),
// и debounce usePersistedState (300мс) не успел бы долететь до localStorage
// раньше перезагрузки страницы.
const readActiveIdMap = (): Partial<Record<Technique, string>> => {
  try {
    const raw = localStorage.getItem(ACTIVE_ID_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeActiveIdMap = (map: Partial<Record<Technique, string>>): void => {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, JSON.stringify(map));
  } catch { /* localStorage недоступен или переполнен — не критично */ }
};

export const getActiveProjectId = (technique: Technique): string | null =>
  readActiveIdMap()[technique] ?? null;

const setActiveProjectId = (technique: Technique, id: string): void => {
  writeActiveIdMap({ ...readActiveIdMap(), [technique]: id });
};

const clearActiveProjectId = (technique: Technique): void => {
  const map = readActiveIdMap();
  delete map[technique];
  writeActiveIdMap(map);
};

const isCanvasOrientation = (v: unknown): v is CanvasOrientation => v === 'vertical' || v === 'horizontal';

/** Читает под-значение этой техники из общих `app:weaveOrientation`/`app:weaveFlip` (см. комментарий вверху файла). */
const readViewState = (technique: Technique): { orientation?: CanvasOrientation; flipped?: boolean } => {
  let orientation: CanvasOrientation | undefined;
  let flipped: boolean | undefined;
  try {
    const raw = localStorage.getItem(ORIENTATION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && isCanvasOrientation(parsed[technique])) {
      orientation = parsed[technique];
    }
  } catch { /* повреждённое значение — просто не сохраняем поворот */ }
  try {
    const raw = localStorage.getItem(FLIP_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && typeof parsed[technique] === 'boolean') {
      flipped = parsed[technique];
    }
  } catch { /* аналогично */ }
  return { orientation, flipped };
};

/** Вливает orientation/flipped этой техники обратно в общие ключи, не трогая записи других техник. */
const writeViewState = (technique: Technique, orientation: CanvasOrientation | undefined, flipped: boolean | undefined): void => {
  if (orientation !== undefined) {
    let map: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(ORIENTATION_KEY);
      map = raw ? JSON.parse(raw) : {};
    } catch { map = {}; }
    localStorage.setItem(ORIENTATION_KEY, JSON.stringify({ ...map, [technique]: orientation }));
  }
  if (flipped !== undefined) {
    let map: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(FLIP_KEY);
      map = raw ? JSON.parse(raw) : {};
    } catch { map = {}; }
    localStorage.setItem(FLIP_KEY, JSON.stringify({ ...map, [technique]: flipped }));
  }
};

/** Текущая палитра приложения или `undefined`, если ключа нет/он повреждён. */
const readPalette = (): string[] | undefined => {
  try {
    const raw = localStorage.getItem(PALETTE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return isPaletteColors(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/** Ставит палитру проекта. Записи без палитры (старые) текущую не трогают. */
const writePalette = (palette: string[] | undefined): void => {
  if (!isPaletteColors(palette)) return;
  localStorage.setItem(PALETTE_KEY, JSON.stringify(palette));
};

const samePalette = (a: string[] | undefined, b: string[] | undefined): boolean =>
  a === b || (!!a && !!b && a.length === b.length && a.every((color, i) => color === b[i]));

/**
 * Сравнивает текущую живую работу техники (localStorage) со снимком уже
 * сохранённого проекта — для фонового автосейва (см. useProjectLibrary.ts):
 * снимать миниатюру и писать в IndexedDB стоит только если что-то реально
 * изменилось, а не на каждый тик таймера.
 */
export const hasLiveDataChanged = (
  technique: Technique,
  against: {
    data: Record<string, string>;
    orientation?: CanvasOrientation;
    flipped?: boolean;
    palette?: string[];
  },
): boolean => {
  const { orientation, flipped } = readViewState(technique);
  if (orientation !== against.orientation || flipped !== against.flipped) return true;
  // Записи без палитры (сохранённые до того, как она вошла в снимок) сравнивать
  // не с чем: живая палитра есть всегда (usePersistedState пишет и дефолт), и
  // строгое сравнение навсегда пометило бы такие проекты изменёнными — статус в
  // хедере горел бы, пока пользователь не нажмёт Save вручную. Палитра доедет в
  // запись при первом же настоящем сохранении.
  if (against.palette !== undefined && !samePalette(readPalette(), against.palette)) return true;
  const live = collectKeysWithPrefix(`${technique}:`);
  const liveKeys = Object.keys(live);
  const againstKeys = Object.keys(against.data);
  if (liveKeys.length !== againstKeys.length) return true;
  return liveKeys.some((key) => live[key] !== against.data[key]);
};

/** Сохраняет текущую живую работу техники как новый проект и делает его активным. */
export const saveNewProject = async (
  technique: Technique, name: string, thumbnail: Blob | null,
): Promise<ProjectRecord> => {
  const now = new Date().toISOString();
  const { orientation, flipped } = readViewState(technique);
  const record: ProjectRecord = {
    id: crypto.randomUUID(),
    version: RECORD_VERSION,
    technique,
    name,
    savedAt: now,
    updatedAt: now,
    data: collectKeysWithPrefix(`${technique}:`),
    orientation,
    flipped,
    palette: readPalette(),
    thumbnail,
  };
  await putRecord(record);
  setActiveProjectId(technique, record.id);
  return record;
};

/** Перезаписывает активный проект текущей живой работой (тот же id, свежий снимок). Нет активного — no-op. */
export const updateActiveProject = async (
  technique: Technique, thumbnail: Blob | null,
): Promise<ProjectRecord | null> => {
  const id = getActiveProjectId(technique);
  if (!id) return null;
  const existing = await getRecord(id);
  if (!existing) return null;
  const { orientation, flipped } = readViewState(technique);
  const record: ProjectRecord = {
    ...existing,
    data: collectKeysWithPrefix(`${technique}:`),
    orientation,
    flipped,
    palette: readPalette(),
    thumbnail,
    updatedAt: new Date().toISOString(),
  };
  await putRecord(record);
  return record;
};

/**
 * Заменяет живую работу данными сохранённого проекта и делает его активным.
 * НЕ перезагружает страницу — это должен сделать вызывающий (useProjectLibrary),
 * после подтверждения пользователя, тем же паттерном, что и applyProjectData
 * в useProjectIO.ts.
 */
export const loadProject = async (id: string): Promise<ProjectRecord> => {
  const record = await getRecord(id);
  if (!record) throw new Error('Project not found');
  applyKeysWithPrefix(`${record.technique}:`, record.data);
  writeViewState(record.technique, record.orientation, record.flipped);
  writePalette(record.palette);
  setActiveProjectId(record.technique, record.id);
  return record;
};
