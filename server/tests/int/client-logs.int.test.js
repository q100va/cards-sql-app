// server/tests/int/client-logs.int.test.js
import express from 'express';
import request from 'supertest';
import router from '../../routes/client-logs.js';
import { handleError } from '../../middlewares/error-handler.js';
import logger from '../../logging/logger.js';
import { jest } from "@jest/globals";

describe('POST /api/client-logs (integration)', () => {
  const makeApp = () => {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/client-logs', router);
    app.use(handleError);
    return app;
  };

  beforeEach(() => {
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('204 and logs each item at the correct level', async () => {
    const batch = {
      app: 'web',
      env: 'test',
      items: [
        {
          level: 'warn',
          message: 'w1',
          ts: new Date().toISOString(),
          sessionId: 's12345678',
          pageUrl: '/p1',
          route: '/r1',
          userAgent: 'UA',
          context: { a: 1 }
        },
        {
          level: 'error',
          message: 'e1',
          ts: new Date().toISOString(),
          sessionId: 's12345678',
          pageUrl: '/p2',
          route: '/r2',
          userAgent: 'UA',
          context: { b: 2 },
          stack: 'Error: boom\n at x',
        },
      ],
    };

    const res = await request(makeApp())
      .post('/api/client-logs')
      .send(batch);

    expect(res.status).toBe(204);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);

    // Проверим, что структура entry корректная и message передан вторым аргументом
    const [warnEntry, warnMsg] = logger.warn.mock.calls[0];
    expect(warnMsg).toBe('w1');
    expect(warnEntry).toMatchObject({
      client: true,
      app: 'web',
      env: 'test',
      ts: expect.any(String),
      sessionId: 's12345678',
      pageUrl: '/p1',
      route: '/r1',
      userAgent: 'UA',
      context: { a: 1 },
      // поля с null по умолчанию, если не пришли
      corrId: null,
      userId: null,
    });

    const [errEntry, errMsg] = logger.error.mock.calls[0];
    expect(errMsg).toBe('e1');
    expect(errEntry).toMatchObject({
      client: true,
      app: 'web',
      env: 'test',
      sessionId: 's12345678',
      pageUrl: '/p2',
      route: '/r2',
      userAgent: 'UA',
      context: { b: 2 },
    });
  });

  it('422 on invalid body (validateRequest → handleError)', async () => {
    const res = await request(makeApp())
      .post('/api/client-logs')
      .send({ app: 'web', env: 'test', items: 'not-array' });

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body.code).toBe('ERRORS.VALIDATION');
  });

  it('500 + ERRORS.LOGS_NOT_ACCEPTED if logger throws (catch branch)', async () => {
    // Смоделируем падение логгера, чтобы попасть в catch
    logger.warn.mockImplementationOnce(() => {
      throw new Error('logger down');
    });

    const res = await request(makeApp())
      .post('/api/client-logs')
      .send({
        app: 'web',
        env: 'test',
        items: [
          {
            level: 'warn',
            message: 'will-throw',
            ts: new Date().toISOString(),
            sessionId: 'sX12345678',
            pageUrl: '/',
            route: '/',
            userAgent: 'UA',
            context: {},
          },
        ],
      });

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body.code).toBe('ERRORS.LOGS_NOT_ACCEPTED');
  });
});
