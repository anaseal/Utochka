// Общие защиты для публичных эндпоинтов (api/generate-palette.ts,
// api/share.ts) и их dev-двойника в server.ts. Папка с префиксом `_` —
// Vercel не разворачивает её в отдельный route, только даёт импортировать.
import type { Redis } from '@upstash/redis';

// Fixed-window счётчик поверх уже используемого Redis (Upstash) — лимит N
// запросов за окно на ключ (обычно `<эндпоинт>:<ip>`). Отдельный пакет
// ratelimit ради этого не подключаем.
export const withinRateLimit = async (
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> => {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return count <= limit;
};

// Origin браузеры шлют на все «небезопасные» (POST и т.п.) запросы, в т.ч.
// same-origin — сверка с origin самого запроса ловит вызовы из чужого JS, не
// требуя знать домен деплоя заранее (работает и на preview-деплоях). Не
// блокируем отсутствие заголовка (curl, серверные вызовы без Origin) — от
// прямого скриптового злоупотребления защищает лимит запросов, а не эта
// проверка.
export const isAllowedOrigin = (origin: string | null, selfOrigin: string): boolean =>
  origin === null || origin === selfOrigin;

// Общая для обоих edge-эндпоинтов (api/generate-palette.ts, api/share.ts) —
// оба на Fetch Request. server.ts работает с express.Request (другой доступ
// к заголовкам плюс фолбэк на req.socket.remoteAddress) и держит свою копию.
export const clientIp = (req: Request): string =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
