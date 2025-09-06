// server/tests/int/request-logger.int.test.js
import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

import { buildRequestLogger } from '../../middlewares/request-logger.js';
import { correlationId } from '../../middlewares/correlation-id.js';
import { handleError, notFound } from '../../middlewares/error-handler.js';

describe('requestLogger (integration via factory injection)', () => {
  // test logger we fully control
  const testLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(), // pino-http usually does logger.child(...)
  };
  testLogger.child.mockReturnValue(testLogger);

  // tiny fake pino-http that exercises our options and writes to testLogger
  const fakePinoHttp = (opts = {}) => {
    return (req, res, next) => {
      const finalize = () => {
        const err = res.locals?.err;
        const level = (opts.customLogLevel && opts.customLogLevel(req, res, err)) || 'info';
        const msg = err
          ? (opts.customErrorMessage && opts.customErrorMessage(req, res, err)) ||
            `ERROR ${req.method} ${req.url} → ${res.statusCode || 500}`
          : (opts.customSuccessMessage && opts.customSuccessMessage(req, res)) ||
            `${req.method} ${req.url} → ${res.statusCode}`;

        const payload = { ...(opts.customProps ? opts.customProps(req, res) : {}) };
        if (opts.serializers?.req) payload.req = opts.serializers.req(req);
        if (opts.serializers?.res) payload.res = opts.serializers.res(res);

        if (level === 'error') testLogger.error(payload, msg);
        else if (level === 'warn') testLogger.warn(payload, msg);
        else testLogger.info(payload, msg);
      };

      res.on('finish', finalize);
      next();
    };
  };

  const makeApp = ({ withNotFound = false } = {}) => {
    const app = express();

    app.use(correlationId());
    // inject our fake pino-http and testLogger
    app.use(buildRequestLogger(fakePinoHttp, testLogger));

    app.get('/ok', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/bad', (_req, res) => res.status(400).json({ bad: true }));
    app.get('/err', (_req, _res, next) => next(Object.assign(new Error('boom'), { status: 500 })));

    // capture error so fake pino-http can include err.message
    app.use((err, _req, res, next) => {
      res.locals.err = err;
      next(err);
    });

    if (withNotFound) app.use(notFound);
    app.use(handleError);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs 200 as info with custom success message and serialized req/res', async () => {
    const app = makeApp();
    const res = await request(app).get('/ok').set('user-agent', 'TestUA');
    expect(res.status).toBe(200);

    expect(testLogger.info).toHaveBeenCalledTimes(1);
    expect(testLogger.warn).not.toHaveBeenCalled();
    expect(testLogger.error).not.toHaveBeenCalled();

    const [payload, msg] = testLogger.info.mock.calls[0];
    expect(msg).toBe('GET /ok → 200');
    expect(payload).toEqual(
      expect.objectContaining({
        correlationId: expect.any(String),
        req: expect.objectContaining({
          id: expect.any(String),
          method: 'GET',
          url: '/ok',
          ip: expect.any(String),
        }),
        res: expect.objectContaining({ statusCode: 200 }),
      })
    );
  });

  it('logs 400 as warn with custom success message', async () => {
    const app = makeApp();
    const res = await request(app).get('/bad');
    expect(res.status).toBe(400);

    expect(testLogger.warn).toHaveBeenCalledTimes(1);
    const [payload, msg] = testLogger.warn.mock.calls[0];
    expect(msg).toBe('GET /bad → 400');
    expect(payload).toEqual(
      expect.objectContaining({
        correlationId: expect.any(String),
        res: expect.objectContaining({ statusCode: 400 }),
      })
    );
  });

  it('logs 500 as error with custom error message including err.message', async () => {
    const app = makeApp();
    const res = await request(app).get('/err');
    expect(res.status).toBeGreaterThanOrEqual(500);

    expect(testLogger.error).toHaveBeenCalledTimes(1);
    const [payload, msg] = testLogger.error.mock.calls[0];
    expect(msg).toBe('ERROR GET /err → 500: boom');
    expect(payload).toEqual(
      expect.objectContaining({
        correlationId: expect.any(String),
        res: expect.objectContaining({ statusCode: expect.any(Number) }),
      })
    );
  });

  it('honors x-correlation-id in payload and req serializer', async () => {
    const app = makeApp();
    const customId = 'corr-xyz';
    const res = await request(app).get('/ok').set('x-correlation-id', customId);
    expect(res.status).toBe(200);

    expect(testLogger.info).toHaveBeenCalledTimes(1);
    const [payload] = testLogger.info.mock.calls[0];
    expect(payload.correlationId).toBe(customId);
    expect(payload.req.id).toBe(customId);
  });

  it('404 path logs as warn (via notFound)', async () => {
    const app = makeApp({ withNotFound: true });
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);

    expect(testLogger.warn).toHaveBeenCalledTimes(1);
    const [payload, msg] = testLogger.warn.mock.calls[0];
    expect(msg).toBe('GET /nope → 404');
    expect(payload).toEqual(
      expect.objectContaining({
        res: expect.objectContaining({ statusCode: 404 }),
      })
    );
  });
});
