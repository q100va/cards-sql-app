// server/cors.ts (или рядом в app.js)

// 1) Заведи ENV с разрешёнными источниками (CSV и/или паттерны)
const FROM_ENV = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Локалка по умолчанию:
const DEFAULTS = [
  'http://localhost:56379',
  'http://127.0.0.1:56379',
];

// Примеры для прода (замени на свой домен фронта)
const EXAMPLES = [
  // точный домен (прод)
  'https://YOUR-APP.vercel.app',
  // превью-домены Vercel (разные поддомены) — временно, только на время тестов
  '*.vercel.app',
];

const allowedList = new Set([...DEFAULTS, ...EXAMPLES, ...FROM_ENV]);

function matches(origin, pattern) {
  if (pattern === origin) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // '.vercel.app'
    return origin.endsWith(suffix);
  }
  return false;
}

function isAllowed(origin){
  if (!origin) return false;
  for (const p of allowedList) {
    if (matches(origin, p)) return true;
  }
  return false;
}

export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (origin && isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // корректный кеш на CDN/браузере
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-lang');

  // Разрешим кэш преплайтов на короткое время (опционально):
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}
