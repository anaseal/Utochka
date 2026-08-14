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

// Последний элемент списка адресов в заголовке. Прокси **дописывает** адрес,
// с которого пришёл запрос, в конец `x-forwarded-for` — значит последний
// элемент поставил ближайший к нам прокси, а всё левее прислал сам клиент и
// подделывается свободно. Первое значение брать нельзя: отправитель одним
// заголовком выбирал бы себе ключ лимита и обходил лимит на всех трёх
// эндпоинтах.
const lastHop = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const parts = value.split(',');
  const last = parts[parts.length - 1]?.trim();
  return last ? last : null;
};

// IP клиента для ключа лимита — только для эндпоинтов на Fetch Request
// (api/generate-palette.ts, api/share.ts). Порядок источников — от
// неподделываемого к запасному: `x-vercel-forwarded-for` ставит сама платформа
// и вычищает одноимённый заголовок из запроса клиента; `x-real-ip` — то же
// самое у прочих хостингов; `x-forwarded-for` идёт последним, и из него берётся
// последний переход. server.ts (dev-двойник) стоит без доверенного прокси перед
// собой и определяет IP иначе — по адресу сокета.
export const clientIp = (req: Request): string =>
  lastHop(req.headers.get('x-vercel-forwarded-for'))
  ?? lastHop(req.headers.get('x-real-ip'))
  ?? lastHop(req.headers.get('x-forwarded-for'))
  ?? 'unknown';

// Алфавит id Share-ссылки — 62 символа. Общий для боевого эндпоинта и его
// dev-двойника, чтобы ссылки, выданные локально, читались тем же кодом.
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Длина id. Здесь же, а не у каждого эндпоинта: по ней строится и проверка
// формата id на чтении (SHARE_ID_RE ниже) — разойдись они, часть выданных
// ссылок перестала бы проходить собственную же валидацию.
const SHARE_ID_LENGTH = 7;
// Наибольшее кратное 62, помещающееся в байт (62 × 4 = 248). Байты 248..255
// отбрасываем и добираем новые вместо простого `b % 62` по всему диапазону:
// иначе первые восемь символов алфавита выпадали бы чаще прочих (5 шансов из
// 256 против 4) и id стал бы чуть предсказуемее, чем обещают его 41.7 бита.
const ID_BYTE_LIMIT = ID_CHARS.length * Math.floor(256 / ID_CHARS.length);

// Источник случайных байт передаёт вызывающий: на Edge это
// crypto.getRandomValues, в dev-сервере — randomBytes из node:crypto (глобальный
// crypto есть не во всех версиях Node, под которыми запускают `dev:server`).
export const randomShareId = (randomBytes: (size: number) => Uint8Array): string => {
  let id = '';
  while (id.length < SHARE_ID_LENGTH) {
    for (const b of randomBytes(SHARE_ID_LENGTH - id.length)) {
      if (b < ID_BYTE_LIMIT) id += ID_CHARS[b % ID_CHARS.length];
    }
  }
  return id;
};

// Share-записи и счётчики лимита запросов (`rl:…`) лежат в одной базе
// Upstash, а id для чтения приходит из query-строки. Поэтому id нельзя
// класть в redis.get как есть: `?id=rl:share:read:<ip>` вернул бы значение
// чужого счётчика — и точно так же любой ключ, который в этой базе заведёт
// следующая фича. Разводим два способа сразу: свой префикс у ключа записи и
// проверка формата id на входе (ничего, кроме собственного 7-символьного
// id, до базы не доходит). Обе проверки живут здесь, а не по копии в
// api/share.ts и server.ts — разъехавшись, копии дали бы ссылки, которые
// пишутся в одном пространстве имён, а читаются в другом.
const SHARE_ID_RE = new RegExp(`^[A-Za-z0-9]{${SHARE_ID_LENGTH}}$`);

export const isShareId = (id: unknown): id is string => typeof id === 'string' && SHARE_ID_RE.test(id);

export const shareKey = (id: string): string => `share:${id}`;

// Чтение share-записи. Второй заход, без префикса, — совместимость со
// ссылками, выданными до разделения пространств имён: там ключом лежит голый
// id. Пускать в него произвольную строку не даёт isShareId у вызывающего
// кода, а писать без префикса больше некуда, поэтому строка сама становится
// ненужной, когда истечёт TTL последней старой записи (90 дней от деплоя) —
// тогда её можно удалить.
export const readShare = async (redis: Redis, id: string): Promise<string | null> =>
  (await redis.get<string>(shareKey(id))) ?? (await redis.get<string>(id));
