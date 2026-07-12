import express, { Request, Response } from 'express';
import https from 'https';

const app = express();
const PORT = 3001;

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

app.listen(PORT, () => {
  console.log(`🎨 Palette proxy server running on http://localhost:${PORT}`);
  console.log(`   Endpoint: POST http://localhost:${PORT}/api/generate-palette`);
});
