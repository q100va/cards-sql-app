import { Router } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import logger from '../logging/logger.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  clientLogBatchSchema,
} from '../../shared/dist/schemas/client-log.schema.js';

const router = Router();

const clientLogsLimiter = new RateLimiterMemory({
  points: 300,
  duration: 60,
});

function maskPII(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const email =
    /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

  const phone =
    /\b(\+?\d{1,3}[-.\s]?)?(\d{2,3}[-.\s]?){2,4}\d\b/g;

  const bearer =
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;

  return value
    .replace(
      email,
      (_, first, domain) =>
        `${first}***@${domain}`,
    )
    .replace(
      phone,
      (match) =>
        match.length <= 6
          ? '***'
          : `${match.slice(0, 3)}***${match.slice(-2)}`,
    )
    .replace(
      bearer,
      'Bearer [REDACTED]',
    );
}

function sanitizeLogValue(
  value,
  key = '',
) {
  const secretKeys = [
    'password',
    'token',
    'authorization',
    'cookie',
  ];

  const normalizedKey =
    key.toLowerCase();

  if (
    secretKeys.some((secretKey) =>
      normalizedKey.includes(secretKey),
    )
  ) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return maskPII(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeLogValue(item),
    );
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([nestedKey, nestedValue]) => [
          nestedKey,
          sanitizeLogValue(
            nestedValue,
            nestedKey,
          ),
        ],
      ),
    );
  }

  return value;
}

async function limitClientLogs(
  req,
  res,
  next,
) {
  const itemsCount =
    Array.isArray(req.body?.items)
      ? req.body.items.length
      : 1;

  const points = Math.min(
    Math.max(itemsCount, 1),
    200,
  );

  try {
    await clientLogsLimiter.consume(
      req.ip,
      points,
    );

    next();
  } catch {
    return res.status(429).end();
  }
}

router.post(
  '/',
  limitClientLogs,
  validateRequest(
    clientLogBatchSchema,
    'body',
  ),
  (req, res, next) => {
    try {
      const batch = req.body;

      // Forward validated and sanitized client logs to the server logger.
      for (const item of batch.items) {
        const entry = {
          client: true,
          app: batch.app,
          env: batch.env,
          ts: item.ts,
          sessionId: item.sessionId,
          corrId:
            item.corrId ?? null,
          userId:
            item.userId ?? null,
          pageUrl:
            maskPII(item.pageUrl),
          route:
            maskPII(item.route),
          userAgent:
            maskPII(item.userAgent),
          context: item.context
            ? sanitizeLogValue(
              item.context,
            )
            : undefined,
          stack:
            maskPII(item.stack),
        };

        const message =
          maskPII(item.message);

        if (item.level === 'error') {
          logger.error(
            entry,
            message,
          );
        } else {
          logger.warn(
            entry,
            message,
          );
        }
      }

      return res
        .status(204)
        .send();
    } catch (error) {
      error.code =
        error.code ??
        'ERRORS.DATA_SAVE_FAILED';

      next(error);
    }
  },
);

export default router;
