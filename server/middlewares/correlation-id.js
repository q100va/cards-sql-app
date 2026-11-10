import { randomUUID } from 'crypto';

const HEADERS = [
  'x-request-id',
  'x-correlation-id',
];

const ALLOWED =
  /^[A-Za-z0-9._-]{1,128}$/;

function getIncomingId(req) {
  for (const header of HEADERS) {
    const value =
      req.headers[header];

    const candidate =
      Array.isArray(value)
        ? value[0]
        : value;

    if (
      typeof candidate === 'string' &&
      ALLOWED.test(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

export function correlationId() {
  return (req, res, next) => {
    // Reuse a safe upstream request ID or generate a new one.
    const correlationId =
      getIncomingId(req) ??
      randomUUID();

    req.correlationId =
      correlationId;

    // Return the ID so clients and logs can reference the same request.
    res.setHeader(
      'X-Request-Id',
      correlationId,
    );

    return next();
  };
}
