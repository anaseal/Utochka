export const config = { runtime: 'edge' };

import { Redis } from '@upstash/redis';
import { json } from './_lib/http';
import {
  clientIp,
  isAllowedOrigin,
  isShareId,
  randomShareId,
  readShare,
  shareKey,
  withinRateLimit,
} from './_lib/security';

const redis = Redis.fromEnv();

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

const randomId = (): string => randomShareId((size) => crypto.getRandomValues(new Uint8Array(size)));

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === 'POST') {
    if (!isAllowedOrigin(req.headers.get('origin'), url.origin)) {
      return json({ error: 'Forbidden' }, 403);
    }
    if (!(await withinRateLimit(redis, `rl:share:write:${clientIp(req)}`, WRITE_RATE_LIMIT, RATE_WINDOW_SECONDS))) {
      return json({ error: 'Too many requests' }, 429);
    }

    const payload = await req.text();
    if (!payload || payload.length > MAX_PAYLOAD_LENGTH) {
      return json({ error: 'Invalid payload' }, 400);
    }
    let id = randomId();
    while (await redis.exists(shareKey(id))) id = randomId();
    await redis.set(shareKey(id), payload, { ex: SHARE_TTL_SECONDS });
    return json({ id });
  }

  if (req.method === 'GET') {
    if (!(await withinRateLimit(redis, `rl:share:read:${clientIp(req)}`, READ_RATE_LIMIT, RATE_WINDOW_SECONDS))) {
      return json({ error: 'Too many requests' }, 429);
    }
    const id = url.searchParams.get('id');
    if (!isShareId(id)) return json({ error: 'Missing id' }, 400);
    const data = await readShare(redis, id);
    if (data === null) return json({ error: 'Not found' }, 404);
    return json({ data });
  }

  return json({ error: 'Method not allowed' }, 405);
}
