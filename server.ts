import express, { Request, Response } from 'express';
import https from 'https';
import { randomBytes } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { isAllowedOrigin, withinRateLimit } from './api/_lib/security';

const app = express();
const PORT = 3001;
const DEV_ORIGIN = 'http://localhost:5173';
const redis = Redis.fromEnv();

const SHARE_ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHARE_ID_LENGTH = 7;
const SHARE_MAX_PAYLOAD_LENGTH = 200_000;
const SHARE_TTL_SECONDS = 90 * 24 * 60 * 60;
const PALETTE_RATE_LIMIT = 20;
const SHARE_WRITE_RATE_LIMIT = 10;
const SHARE_READ_RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 60;

const randomShareId = (): string =>
  Array.from(randomBytes(SHARE_ID_LENGTH), (b) => SHARE_ID_CHARS[b % SHARE_ID_CHARS.length]).join('');

const clientIp = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';

app.use(express.json());

// Обычный dev-сценарий (Vite, localhost:5173) до этого сервера достаёт через
// server-side прокси в vite.config.js ('/api' → localhost:3001) — это
// same-origin для браузера, CORS там не нужен. Заголовок ниже — только на
// случай прямого обращения к :3001 (например, открытая вкладка с фронтом без
// прокси) и жёстко ограничен известным dev-origin, а не '*': на этом порту
// живут боевые креды Redis (Redis.fromEnv()), пускать туда произвольные сайты
// нельзя.
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', DEV_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Прокси для Colormind API
app.post('/api/generate-palette', async (req: Request, res: Response) => {
  if (!isAllowedOrigin(req.get('origin') ?? null, DEV_ORIGIN)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (!(await withinRateLimit(redis, `rl:generate-palette:${clientIp(req)}`, PALETTE_RATE_LIMIT, RATE_WINDOW_SECONDS))) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const data = JSON.stringify(req.body);

  const options = {
    hostname: 'colormind.io',
    path: '/api/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let responseData = '';

    proxyRes.on('data', (chunk) => {
      responseData += chunk;
    });

    proxyRes.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        res.json(parsed);
      } catch {
        res.status(500).json({ error: 'Invalid response from Colormind' });
      }
    });
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy request error:', error);
    res.status(500).json({ error: 'Failed to connect to Colormind API' });
  });

  proxyReq.write(data);
  proxyReq.end();
});

// Прокси для Share-ссылки (см. api/share.ts — на Vercel это Edge Function,
// здесь тот же контракт для локальной разработки через `npm run dev:server`).
app.post('/api/share', express.text({ type: '*/*' }), async (req: Request, res: Response) => {
  if (!isAllowedOrigin(req.get('origin') ?? null, DEV_ORIGIN)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (!(await withinRateLimit(redis, `rl:share:write:${clientIp(req)}`, SHARE_WRITE_RATE_LIMIT, RATE_WINDOW_SECONDS))) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const payload = req.body;
  if (typeof payload !== 'string' || !payload || payload.length > SHARE_MAX_PAYLOAD_LENGTH) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }
  let id = randomShareId();
  while (await redis.exists(id)) id = randomShareId();
  await redis.set(id, payload, { ex: SHARE_TTL_SECONDS });
  res.json({ id });
});

app.get('/api/share', async (req: Request, res: Response) => {
  if (!(await withinRateLimit(redis, `rl:share:read:${clientIp(req)}`, SHARE_READ_RATE_LIMIT, RATE_WINDOW_SECONDS))) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const id = req.query.id;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const data = await redis.get<string>(id);
  if (data === null) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ data });
});

app.listen(PORT, () => {
  console.log(`🎨 Dev API server (palette proxy + share links) running on http://localhost:${PORT}`);
  console.log(`   Endpoints: POST /api/generate-palette, POST /api/share, GET /api/share`);
});
