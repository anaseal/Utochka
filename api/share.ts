export const config = { runtime: 'edge' };

import { Redis } from '@upstash/redis';
import { clientIp, isAllowedOrigin, withinRateLimit } from './_lib/security';

const redis = Redis.fromEnv();

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ID_LENGTH = 7;
// Схема уже сжата gzip'ом на клиенте перед отправкой сюда — с большим
// запасом хватает даже на самые крупные узоры.
const MAX_PAYLOAD_LENGTH = 200_000;
// 90 дней: достаточно для работы над одним изделием со ссылкой под рукой, но
// не даёт базе расти вникуда — записей без владельца и без способа их удалить
// иначе не бывает.
const SHARE_TTL_SECONDS = 90 * 24 * 60 * 60;
const WRITE_RATE_LIMIT = 10;
const READ_RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 60;

const randomId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join('');
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === 'POST') {
    if (!isAllowedOrigin(req.headers.get('origin'), url.origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    if (!(await withinRateLimit(redis, `rl:share:write:${clientIp(req)}`, WRITE_RATE_LIMIT, RATE_WINDOW_SECONDS))) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    }

    const payload = await req.text();
    if (!payload || payload.length > MAX_PAYLOAD_LENGTH) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }
    let id = randomId();
    while (await redis.exists(id)) id = randomId();
    await redis.set(id, payload, { ex: SHARE_TTL_SECONDS });
    return new Response(JSON.stringify({ id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'GET') {
    if (!(await withinRateLimit(redis, `rl:share:read:${clientIp(req)}`, READ_RATE_LIMIT, RATE_WINDOW_SECONDS))) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    }
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
    const data = await redis.get<string>(id);
    if (data === null) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
