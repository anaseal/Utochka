export const config = { runtime: 'edge' };

import { Redis } from '@upstash/redis';
import { json } from './_lib/http';
import { clientIp, isAllowedOrigin, withinRateLimit } from './_lib/security';

const redis = Redis.fromEnv();

// Без ограничений этот эндпоинт — бесплатный анонимный прокси до colormind.io
// от имени нашего домена: любой сайт мог слать сюда что угодно и жечь нашу
// квоту/репутацию у Colormind.
const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  if (!isAllowedOrigin(req.headers.get('origin'), url.origin)) {
    return json({ error: 'Forbidden' }, 403);
  }

  if (!(await withinRateLimit(redis, `rl:generate-palette:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_SECONDS))) {
    return json({ error: 'Too many requests' }, 429);
  }

  try {
    const body = await req.text();

    const colormindRes = await fetch('https://colormind.io/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await colormindRes.text();

    return new Response(data, {
      status: colormindRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return json({ error: 'Failed to connect to Colormind API' }, 500);
  }
}
