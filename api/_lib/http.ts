// Сборка JSON-ответа для эндпоинтов на Fetch Response (api/share.ts,
// api/generate-palette.ts). Пока каждая ветка собирала Response руками,
// Content-Type проставлялся только на успешных, а на ошибках (400, 403, 404,
// 405, 429, 500) забывался — тело было JSON'ом, а заголовок уезжал
// text/plain. Здесь заголовок один на все ветки, и забыть его негде.
// server.ts (dev-двойник) обходится без этого: express res.json() ставит тип
// сам.
export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
