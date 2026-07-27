import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installLocalStorageMock, seedLocalStorage } from '../test/localStorageMock';
import { buildShareUrl, parseShareHash } from './shareLink';

const ORIGIN = 'https://silyanka.example';

// Бэкенд недоступен: любой сетевой сбой должен уводить на длинную ссылку,
// а не ломать сценарий.
const offlineBackend = () => vi.fn(() => Promise.reject(new Error('offline')));

// Живой бэкенд в памяти: POST кладёт payload и отдаёт id, GET отдаёт по id.
const memoryBackend = () => {
  const store = new Map<string, string>();
  let nextId = 1;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const id = `id${nextId++}`;
      store.set(id, init.body as string);
      return new Response(JSON.stringify({ id }), { status: 200 });
    }
    const id = new URL(url, ORIGIN).searchParams.get('id') ?? '';
    const data = store.get(id);
    if (data === undefined) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify({ data }), { status: 200 });
  });
  return { fetchMock, store };
};

beforeEach(() => {
  installLocalStorageMock();
  vi.stubGlobal('location', { origin: ORIGIN, pathname: '/' });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('buildShareUrl', () => {
  it('с работающим бэкендом даёт короткую ссылку #g=', async () => {
    const { fetchMock } = memoryBackend();
    vi.stubGlobal('fetch', fetchMock);

    const url = await buildShareUrl();

    expect(url).toBe(`${ORIGIN}/#g=id1`);
    expect(fetchMock).toHaveBeenCalledWith('/api/share', expect.objectContaining({ method: 'POST' }));
  });

  it('при недоступном бэкенде откатывается на длинную ссылку #s=', async () => {
    vi.stubGlobal('fetch', offlineBackend());

    const url = await buildShareUrl();

    expect(url.startsWith(`${ORIGIN}/#s=`)).toBe(true);
  });

  it('ответ не-2xx от бэкенда — тоже откат на длинную ссылку', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));

    expect((await buildShareUrl()).startsWith(`${ORIGIN}/#s=`)).toBe(true);
  });

  it('payload в ссылке — base64url: без +, / и =', async () => {
    seedLocalStorage({ 'silyanka:designMap': Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`node-0-${i}`, '#ff8800']),
    ) });
    vi.stubGlobal('fetch', offlineBackend());

    const payload = (await buildShareUrl()).split('#s=')[1];

    expect(payload).not.toMatch(/[+/=]/);
    expect(payload.length).toBeGreaterThan(0);
  });
});

describe('parseShareHash', () => {
  it('длинная ссылка разбирается обратно в то же состояние', async () => {
    const design = { 'node-0-0': '#ff0000', 'node-1-2': '#00ff00' };
    seedLocalStorage({ 'silyanka:designMap': design, 'silyanka:gridSize': { width: 8, height: 20 } });
    vi.stubGlobal('fetch', offlineBackend());

    const hash = new URL(await buildShareUrl()).hash;
    const parsed = await parseShareHash(hash);

    expect(parsed?.localStorage['silyanka:designMap']).toBe(JSON.stringify(design));
    expect(parsed?.localStorage['silyanka:gridSize']).toBe(JSON.stringify({ width: 8, height: 20 }));
  });

  it('короткая ссылка разбирается через бэкенд', async () => {
    const design = { 'node-0-0': '#ff0000' };
    seedLocalStorage({ 'silyanka:designMap': design });
    const { fetchMock } = memoryBackend();
    vi.stubGlobal('fetch', fetchMock);

    const hash = new URL(await buildShareUrl()).hash;
    const parsed = await parseShareHash(hash);

    expect(parsed?.localStorage['silyanka:designMap']).toBe(JSON.stringify(design));
  });

  // Сквозная проверка исключений из projectFile.ts: до получателя ссылки
  // прогресс плетения дойти не должен.
  it('прогресс плетения не переживает круг «ссылка → разбор»', async () => {
    seedLocalStorage({
      'silyanka:designMap': { 'node-0-0': '#ff0000' },
      'silyanka:weavePasses': { 'node-0-0': 3 },
      'silyanka:weaveLastSegment': ['node-0-0'],
    });
    vi.stubGlobal('fetch', offlineBackend());

    const parsed = await parseShareHash(new URL(await buildShareUrl()).hash);

    expect(parsed?.localStorage).toHaveProperty('silyanka:designMap');
    expect(parsed?.localStorage).not.toHaveProperty('silyanka:weavePasses');
    expect(parsed?.localStorage).not.toHaveProperty('silyanka:weaveLastSegment');
  });

  it('не-Share-хэш игнорируется', async () => {
    vi.stubGlobal('fetch', vi.fn());

    expect(await parseShareHash('')).toBeNull();
    expect(await parseShareHash('#section')).toBeNull();
    expect(await parseShareHash('#s=')).toBeNull();
  });

  it('повреждённый payload не роняет приложение', async () => {
    vi.stubGlobal('fetch', vi.fn());

    expect(await parseShareHash('#s=не-base64-и-не-gzip')).toBeNull();
  });

  it('неизвестный id на бэкенде — null', async () => {
    const { fetchMock } = memoryBackend();
    vi.stubGlobal('fetch', fetchMock);

    expect(await parseShareHash('#g=нет-такого')).toBeNull();
  });

  it('сетевая ошибка при разборе короткой ссылки — null', async () => {
    vi.stubGlobal('fetch', offlineBackend());

    expect(await parseShareHash('#g=id1')).toBeNull();
  });
});
