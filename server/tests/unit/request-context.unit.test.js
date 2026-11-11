// server/tests/unit/request-context.unit.test.js

import { Router } from 'express';
import request from 'supertest';

import { getRequestContext, withRequestContext } from '../../middlewares/request-context.js';

import { makeTestApp } from './makeApp.js';

describe('request context', () => {
  it('returns an empty object outside of a request', () => {
    expect(getRequestContext()).toEqual({});
  });

  it('stores request data and preserves it across an async boundary', async () => {
    const router = Router();

    router.use((req, _res, next) => {
      req.correlationId = 'cid-123';
      next();
    });

    router.use(withRequestContext);

    router.get('/', async (_req, res) => {
      await Promise.resolve();

      res.status(200).json(getRequestContext());
    });

    const app = makeTestApp(router);

    const response = await request(app).get('/').set('user-agent', 'test-agent').expect(200);

    expect(response.body).toMatchObject({
      correlationId: 'cid-123',
      userAgent: 'test-agent',
    });

    expect(response.body.ip).toEqual(expect.any(String));
  });

  it('falls back to req.id when correlationId is missing', async () => {
    const router = Router();

    router.use((req, _res, next) => {
      req.id = 'request-id-fallback';
      next();
    });

    router.use(withRequestContext);

    router.get('/', (_req, res) => {
      res.status(200).json(getRequestContext());
    });

    const app = makeTestApp(router);

    const response = await request(app).get('/').expect(200);

    expect(response.body.correlationId).toBe('request-id-fallback');
  });

  it('keeps concurrent request contexts isolated', async () => {
    const router = Router();

    router.use((req, _res, next) => {
      req.correlationId = req.get('x-test-correlation-id');

      next();
    });

    router.use(withRequestContext);

    router.get('/', async (_req, res) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      res.status(200).json(getRequestContext());
    });

    const app = makeTestApp(router);

    const [first, second] = await Promise.all([request(app).get('/').set(
      'x-test-correlation-id',
      'cid-first'
    ),
    request(app).get('/').set(
      'x-test-correlation-id',
      'cid-second'
    )]);

    expect(first.body.correlationId).toBe('cid-first');

    expect(second.body.correlationId).toBe('cid-second');
  });
});
