import express, { Request, Response } from 'express';
import https from 'https';
import { Redis } from '@upstash/redis';

const app = express();
const PORT = 3001;
const redis = Redis.fromEnv();

const SHARE_ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHARE_ID_LENGTH = 7;
const SHARE_MAX_PAYLOAD_LENGTH = 200_000;

const randomShareId = (): string =>
  Array.from({ length: SHARE_ID_LENGTH }, () => SHARE_ID_CHARS[Math.floor(Math.random() * SHARE_ID_CHARS.length)]).join('');

app.use(express.json());

// CORS middleware
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Прокси для Colormind API
app.post('/api/generate-palette', (req: Request, res: Response) => {
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
  const payload = req.body;
  if (typeof payload !== 'string' || !payload || payload.length > SHARE_MAX_PAYLOAD_LENGTH) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }
  let id = randomShareId();
  while (await redis.exists(id)) id = randomShareId();
  await redis.set(id, payload);
  res.json({ id });
});

app.get('/api/share', async (req: Request, res: Response) => {
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
  console.log(`🎨 Palette proxy server running on http://localhost:${PORT}`);
  console.log(`   Endpoint: POST http://localhost:${PORT}/api/generate-palette`);
});
