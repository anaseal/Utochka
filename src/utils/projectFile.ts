// Сохранение/загрузка проекта одним файлом. Всё состояние приложения уже
// лежит в localStorage под префиксами app:/silyanka:/crossWeave: (см.
// usePersistedState) — файл проекта просто упаковывает и восстанавливает эти
// ключи. Картинка референса (IndexedDB) сознательно не включается.

const PROJECT_FILE_VERSION = 1;
const KEY_PREFIXES = ['app:', 'silyanka:', 'crossWeave:'];

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
export const buildProjectData = (): ProjectFile => ({
  version: PROJECT_FILE_VERSION,
  savedAt: new Date().toISOString(),
  localStorage: collectKeys(),
});

export const exportProject = () => {
  const blob = new Blob([JSON.stringify(buildProjectData())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'silyanka-project.json';
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

// Полностью заменяет собственные ключи localStorage данными из файла/ссылки
// (сначала чистит все app:/silyanka:/crossWeave:, потом пишет новые), не
// трогая ничего постороннего.
export const applyProjectData = (data: ProjectFile): void => {
  const ownKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isOwnKey(key)) ownKeys.push(key);
  }
  ownKeys.forEach(key => localStorage.removeItem(key));

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
