// Ссылка на схему через #-фрагмент URL: тот же JSON, что и в файле проекта
// (см. projectFile.ts, без картинки референса), сжат gzip'ом через
// встроенный CompressionStream и закодирован в base64url — новых
// npm-зависимостей на клиенте не требуется. #-фрагмент никогда не уходит на
// сервер сам по себе — но чтобы получить короткую ссылку, сжатые данные всё
// же отправляются на свой бэкенд (api/share.ts, Vercel Edge Function + Redis)
// и возвращается только id записи. При недоступности бэкенда — откат на
// длинную ссылку с данными прямо в hash, без прерывания сценария.

import { buildProjectData, isProjectFile, type ProjectFile } from './projectFile';

const HASH_PREFIX_LOCAL = '#s=';
const HASH_PREFIX_BACKEND = '#g=';
const SHARE_API = '/api/share';

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

const buildPayload = async (): Promise<string> => {
  if (!isCompressionSupported()) {
    throw new Error('Браузер не поддерживает создание ссылок — обновите браузер.');
  }
  const compressed = await compress(JSON.stringify(buildProjectData()));
  return bytesToBase64Url(compressed);
};

// Сохраняет схему на бэкенде и возвращает id короткой ссылки. null — при
// любой сетевой ошибке или ответе не-2xx, вызывающий код в этом случае
// откатывается на длинную ссылку — сокращение не обязательное условие шаринга.
const saveToBackend = async (payload: string): Promise<string | null> => {
  try {
    const res = await fetch(SHARE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    });
    if (!res.ok) return null;
    const { id } = (await res.json()) as { id?: unknown };
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
};

const loadFromBackend = async (id: string): Promise<string | null> => {
  try {
    const res = await fetch(`${SHARE_API}?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const { data } = (await res.json()) as { data?: unknown };
    return typeof data === 'string' ? data : null;
  } catch {
    return null;
  }
};

export const buildShareUrl = async (): Promise<string> => {
  const payload = await buildPayload();
  const base = `${location.origin}${location.pathname}`;
  const id = await saveToBackend(payload);
  return id ? `${base}${HASH_PREFIX_BACKEND}${id}` : `${base}${HASH_PREFIX_LOCAL}${payload}`;
};

// Разбирает #-фрагмент текущего адреса. Возвращает null, если это не
// Share-ссылка или она повреждена/не найдена — вызывающий код в этом случае
// просто ничего не предлагает загрузить.
export const parseShareHash = async (hash: string): Promise<ProjectFile | null> => {
  if (!isCompressionSupported()) return null;

  let payload: string | null;
  if (hash.startsWith(HASH_PREFIX_BACKEND)) {
    payload = await loadFromBackend(hash.slice(HASH_PREFIX_BACKEND.length));
  } else if (hash.startsWith(HASH_PREFIX_LOCAL)) {
    payload = hash.slice(HASH_PREFIX_LOCAL.length);
  } else {
    return null;
  }
  if (!payload) return null;

  try {
    const json = await decompress(base64UrlToBytes(payload));
    const parsed = JSON.parse(json);
    return isProjectFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
