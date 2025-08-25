import { randomUUID } from 'crypto';

const HEADERS = ['x-request-id', 'x-correlation-id'];
const ALLOWED = /^[A-Za-z0-9._-]{1,128}$/;

function getIncomingId(req) {
  for (const h of HEADERS) {
    const v = req.headers[h];
    if (v) return Array.isArray(v) ? v[0] : v;
  }
  return undefined;
}

export function correlationId() {
  return (req, res, next) => {
    const raw = getIncomingId(req);
    const safe = raw && ALLOWED.test(raw) ? raw : randomUUID();

    req.correlationId = String(safe);
    res.setHeader('X-Request-Id', req.correlationId);
    next();
  };
}
