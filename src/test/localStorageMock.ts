import { vi } from 'vitest';

// Мок localStorage для тестов, которые идут в node-окружении.
//
// Почему не jsdom: сохранение/загрузка проекта (projectFile.ts) и Share-ссылка
// (shareLink.ts) — один сценарий, и ссылка держится на CompressionStream +
// Blob().stream() + Response. В jsdom своя реализация Blob и стримов, и
// смешивать её с нодовским CompressionStream нельзя. Проще дать этому коду
// единственное, чего ему не хватает от браузера, — Storage.
//
// Порядок ключей в моке — порядок вставки, как в браузерной реализации;
// на него опирается обход через localStorage.key(i) в projectFile.ts.
export const installLocalStorageMock = (): Storage => {
  const store = new Map<string, string>();

  const mock: Storage = {
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };

  vi.stubGlobal('localStorage', mock);
  return mock;
};

// Заполняет мок разом: удобнее, чем цепочка setItem в каждом тесте.
export const seedLocalStorage = (entries: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(entries)) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
};

// Снимок текущего содержимого — для проверок «ничего не изменилось».
export const snapshotLocalStorage = (): Record<string, string> => {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== null) data[key] = localStorage.getItem(key) as string;
  }
  return data;
};
