// Ссылка на схему через #-фрагмент URL: тот же JSON, что и в файле проекта
// (см. projectFile.ts, без картинки референса), сжат gzip'ом через
// встроенный CompressionStream и закодирован в base64url — новых
// npm-зависимостей не требуется. #-фрагмент никогда не уходит на сервер, так
// что для самой ссылки бэкенд не нужен.
//
// Для сокращения длинной ссылки используется публичный API is.gd через
// JSONP (он сам это рекомендует для браузерных вызовов — без CORS и без
// собственного бэкенда). Если сервис недоступен, вызывающий код откатывается
// на длинную ссылку — сокращение не является обязательным условием шаринга.

import { buildProjectData, isProjectFile, type ProjectFile } from './projectFile';

const HASH_PREFIX = '#s=';
const IS_GD_TIMEOUT_MS = 5000;

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlToBytes = (b64url: string): Uint8Array => {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const isCompressionSupported = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

const compress = async (text: string): Promise<Uint8Array> => {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const decompress = async (bytes: Uint8Array): Promise<string> => {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
};

export const buildFragmentUrl = async (): Promise<string> => {
  if (!isCompressionSupported()) {
    throw new Error('Браузер не поддерживает создание ссылок — обновите браузер.');
  }
  const compressed = await compress(JSON.stringify(buildProjectData()));
  return `${location.origin}${location.pathname}${HASH_PREFIX}${bytesToBase64Url(compressed)}`;
};

// Разбирает #-фрагмент текущего адреса. Возвращает null, если это не
// Share-ссылка или она повреждена — вызывающий код в этом случае просто
// ничего не предлагает загрузить.
export const parseShareHash = async (hash: string): Promise<ProjectFile | null> => {
  if (!hash.startsWith(HASH_PREFIX) || !isCompressionSupported()) return null;
  try {
    const json = await decompress(base64UrlToBytes(hash.slice(HASH_PREFIX.length)));
    const parsed = JSON.parse(json);
    return isProjectFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

// JSONP-запрос к is.gd. При любой ошибке или таймауте возвращает null —
// колбэк-параметр создаётся с уникальным именем на каждый вызов, чтобы
// параллельные попытки (двойной клик по Share) не затирали друг друга.
export const shortenViaIsGd = (longUrl: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const callbackName = `__isGdCallback_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let settled = false;
    const globals = window as unknown as Record<string, unknown>;

    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      delete globals[callbackName];
      script.remove();
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), IS_GD_TIMEOUT_MS);

    globals[callbackName] = (response: { shorturl?: string }) => finish(response?.shorturl ?? null);
    script.onerror = () => finish(null);
    script.src = `https://is.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(longUrl)}`;
    document.head.appendChild(script);
  });
};
