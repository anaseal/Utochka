// Сохранение/загрузка проекта одним файлом. Всё состояние приложения уже
// лежит в localStorage под префиксами app:/silyanka:/crossWeave:/peyote:
// (см. usePersistedState) — файл проекта просто упаковывает и восстанавливает
// эти ключи. Картинка референса (IndexedDB) сознательно не включается.

const PROJECT_FILE_VERSION = 1;
const KEY_PREFIXES = ['app:', 'silyanka:', 'crossWeave:', 'peyote:'];

export interface ProjectFile {
  version: number;
  savedAt: string;
  localStorage: Record<string, string>;
}

const isOwnKey = (key: string) => KEY_PREFIXES.some(p => key.startsWith(p));

const collectKeys = (): Record<string, string> => {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isOwnKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return data;
};

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

// Удаляет все собственные ключи localStorage (app:/silyanka:/crossWeave:), не
// трогая ничего постороннего. Используется и как первый шаг applyProjectData,
// и напрямую в ErrorBoundary для сброса испорченных данных.
export const clearOwnStorage = (): void => {
  const ownKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isOwnKey(key)) ownKeys.push(key);
  }
  ownKeys.forEach(key => localStorage.removeItem(key));
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
