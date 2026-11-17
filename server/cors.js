const DEFAULT_ORIGINS = [
  'http://localhost:56379',
  'http://127.0.0.1:56379',
];

const allowedOrigins = new Set([
  ...DEFAULT_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

export function corsMiddleware(
  req,
  res,
  next,
) {
  const origin =
    req.headers.origin;

  if (
    origin &&
    allowedOrigins.has(origin)
  ) {
    res.setHeader(
      'Access-Control-Allow-Origin',
      origin,
    );

    res.setHeader(
      'Vary',
      'Origin',
    );

    res.setHeader(
      'Access-Control-Allow-Credentials',
      'true',
    );
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,x-lang',
  );

  res.setHeader(
    'Access-Control-Max-Age',
    '600',
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}
