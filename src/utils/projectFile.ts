// Сохранение/загрузка проекта одним файлом. Всё состояние приложения уже
// лежит в localStorage под префиксами app:/silyanka:/crossWeave:/peyote:/loom:
// (см. usePersistedState) — файл проекта просто упаковывает и восстанавливает
// эти ключи. Картинка референса (IndexedDB) сознательно не включается.

const PROJECT_FILE_VERSION = 1;
const KEY_PREFIXES = ['app:', 'silyanka:', 'crossWeave:', 'peyote:', 'loom:'];

export interface ProjectFile {
  version: number;
  savedAt: string;
  localStorage: Record<string, string>;
}

// Версии collectKeys/clearOwnStorage, параметризованные ОДНИМ префиксом —
// используются библиотекой нескольких проектов (src/utils/projectLibrary.ts):
// та сохраняет/восстанавливает срез по одной технике (`silyanka:` и т.п.), а
// не весь набор KEY_PREFIXES разом, как файл проекта/Share-ссылка ниже.
export const collectKeysWithPrefix = (prefix: string): Record<string, string> => {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return data;
};

// Заменяет все ключи с данным префиксом на data — стирает старые (даже те,
// которых нет в data), затем записывает новые. Тот же приём "собрать индексы,
// потом удалить", что и в clearOwnStorage ниже (удаление сдвигает индексы
// localStorage.key(i), поэтому нельзя удалять в процессе обхода).
export const applyKeysWithPrefix = (prefix: string, data: Record<string, string>): void => {
  const ownKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) ownKeys.push(key);
  }
  ownKeys.forEach(key => localStorage.removeItem(key));
  for (const [key, value] of Object.entries(data)) {
    localStorage.setItem(key, value);
  }
};

const collectKeys = (): Record<string, string> =>
  KEY_PREFIXES.reduce((acc, prefix) => ({ ...acc, ...collectKeysWithPrefix(prefix) }), {});

// Собирает текущее состояние приложения в тот же формат, что уходит в файл
// проекта. Переиспользуется файловым экспортом и Share-ссылкой (см.
// src/utils/shareLink.ts) — второй сознательно не тащит картинку референса
// точно так же, как файловый экспорт.
// Ключи, которые не имеет смысла передавать другому человеку: прогресс
// плетения — это состояние конкретной работы в руках, а не часть схемы.
// Получатель ссылки не должен открывать чужую схему наполовину «затянутой».
// В файл проекта прогресс, наоборот, входит — это своя же работа.
const SHARE_EXCLUDED = ['weavePasses', 'weaveLastSegment', 'weaveMode'];

const isShareable = (key: string) =>
  !SHARE_EXCLUDED.some(suffix => key.endsWith(`:${suffix}`));

export const buildProjectData = (options: { forShare?: boolean } = {}): ProjectFile => {
  const data = collectKeys();
  return {
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    localStorage: options.forShare
      ? Object.fromEntries(Object.entries(data).filter(([key]) => isShareable(key)))
      : data,
  };
};

export const exportProject = () => {
  const blob = new Blob([JSON.stringify(buildProjectData())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'beadlace-project.json';
  link.click();
  URL.revokeObjectURL(url);
};

export const isProjectFile = (v: unknown): v is ProjectFile => {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (obj.version !== PROJECT_FILE_VERSION) return false;
  if (typeof obj.localStorage !== 'object' || obj.localStorage === null) return false;
  return Object.values(obj.localStorage).every(entry => typeof entry === 'string');
};

// Удаляет все собственные ключи localStorage (см. KEY_PREFIXES выше), не
// трогая ничего постороннего. Используется и как первый шаг applyProjectData,
// и напрямую в ErrorBoundary для сброса испорченных данных.
export const clearOwnStorage = (): void => {
  KEY_PREFIXES.forEach(prefix => applyKeysWithPrefix(prefix, {}));
};

// Полностью заменяет собственные ключи localStorage данными из файла/ссылки.
export const applyProjectData = (data: ProjectFile): void => {
  clearOwnStorage();
  for (const [key, value] of Object.entries(data.localStorage)) {
    localStorage.setItem(key, value);
  }
};

// Загружает файл проекта. Кидает Error с текстом для пользователя, если файл
// повреждён или несовместимой версии — в этом случае localStorage не
// меняется.
export const importProject = async (file: File): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Файл повреждён и не может быть прочитан.');
  }
  if (!isProjectFile(parsed)) {
    throw new Error('Это не файл проекта silyanka или его версия не поддерживается.');
  }
  applyProjectData(parsed);
};
