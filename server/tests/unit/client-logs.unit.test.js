/* @jest-environment node */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const limiterConsume = jest.fn();
const limiterDelete = jest.fn();

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

class RateLimiterMemoryMock {
  constructor(options) {
    this.options = options;
    this.consume = limiterConsume;
    this.delete = limiterDelete;
  }
}

jest.unstable_mockModule('rate-limiter-flexible', () => ({
  RateLimiterMemory: RateLimiterMemoryMock,
}));

jest.unstable_mockModule('../../logging/logger.js', () => ({ default: logger }));

jest.unstable_mockModule('../../middlewares/validate-request.js', () =>
({
  validateRequest: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../../shared/dist/schemas/client-log.schema.js', () =>
({
  clientLogBatchSchema: {},
}));

const { default: router } = await import('../../routes/client-logs.js');

function makeApp() {
  const app = express();

  app.use(express.json());

  app.use('/api/client-logs', router);

  // The shared error handler is tested
  // separately. Here we inspect the error
  // produced by this route.
  app.use((error, _req, res, _next) => {
    res.status(error.status ?? 500).json({ code: error.code ?? 'ERRORS.INTERNAL' });
  });

  return app;
}

function makeBatch() {
  return {
    app: 'cards-sql-app',
    env: 'development',
    items: [
      {
        ts: new Date().toISOString(),
        level: 'error',
        message: 'Failed for alice@example.com Bearer abc.def.ghi',
        pageUrl: '/profile?email=alice@example.com',
        route: '/profile',
        userId: 1,
        sessionId: 'session-123',
        userAgent: 'UA',
        stack: 'Authorization: Bearer secret.token.value',
        context: {
          password: 'plain-secret',
          accessToken: 'token-secret',
          nested: { email: 'john@example.com' },
        },
      },
      {
        ts: new Date().toISOString(),
        level: 'warn',
        message: 'Minor warning',
        pageUrl: '/x',
        route: '/x',
        sessionId: 'session-456',
        userAgent: 'UA',
      },
    ],
  };
}

describe('POST /api/client-logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    limiterConsume.mockResolvedValue({
      remainingPoints: 100,
      msBeforeNext: 0,
    });

    limiterDelete.mockResolvedValue(true);
  });

  test('logs error and warning items and returns 204', async () => {
    const response = await request(makeApp()).post('/api/client-logs').send(makeBatch()).expect(204);

    expect(response.body).toEqual({});

    expect(logger.error).toHaveBeenCalledTimes(1);

    expect(logger.warn).toHaveBeenCalledTimes(1);

    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
      client: true,
      app: 'cards-sql-app',
      env: 'development',
      sessionId: 'session-456',
    }), 'Minor warning');
  });

  test('sanitizes sensitive client log data before logging', async () => {
    await request(makeApp()).post('/api/client-logs').send(makeBatch()).expect(204);

    expect(logger.error).toHaveBeenCalledTimes(1);

    const [entry, message] = logger.error.mock.calls[0];

    expect(message).toBe('Failed for a***@example.com Bearer [REDACTED]');

    expect(entry.pageUrl).toBe('/profile?email=a***@example.com');

    expect(entry.stack).toBe('Authorization: Bearer [REDACTED]');

    expect(entry.context).toEqual({
      password: '[REDACTED]',
      accessToken: '[REDACTED]',
      nested: { email: 'j***@example.com' },
    });
  });

  test('charges rate-limit points based on batch size', async () => {
    await request(makeApp()).post('/api/client-logs').send(makeBatch()).expect(204);

    expect(limiterConsume).toHaveBeenCalledWith(expect.any(String), 2);
  });

  test('caps rate-limit cost at 200 points', async () => {
    const item = {
      ts: new Date().toISOString(),
      level: 'warn',
      message: 'message',
    };

    const batch = {
      app: 'cards-sql-app',
      env: 'development',
      items: Array.from({ length: 201 }, () => ({ ...item })),
    };

    await request(makeApp()).post('/api/client-logs').send(batch).expect(204);

    expect(limiterConsume).toHaveBeenCalledWith(expect.any(String), 200);
  });

  test('returns 429 when client log rate limit is exceeded', async () => {
    limiterConsume.mockRejectedValue(new Error('rate limit'));

    const response = await request(makeApp()).post('/api/client-logs').send(makeBatch()).expect(429);

    expect(logger.error).not.toHaveBeenCalled();

    expect(logger.warn).not.toHaveBeenCalled();

    expect(response.text).toBe('');
  });

  test('passes logger failures onward as DATA_SAVE_FAILED', async () => {
    logger.error.mockImplementationOnce(() => {
      throw new Error('logger down');
    });

    const response = await request(makeApp()).post('/api/client-logs').send(makeBatch()).expect(500);

    expect(response.body).toEqual({ code: 'ERRORS.DATA_SAVE_FAILED' });
  });
});
