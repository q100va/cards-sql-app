// server/tests/int/error-handler.correlation.int.test.js
import express from 'express';
import request from 'supertest';

import { handleError, notFound } from '../../middlewares/error-handler.js';
import { correlationId } from '../../middlewares/correlation-id.js';
import { withRequestContext } from '../../middlewares/request-context.js';

const makeApp = (useNotFound = false) => {
  const app = express();

  // Correlation ID must be registered before any routes
  app.use(correlationId());
  // Optional: attach per-request context
  app.use(withRequestContext);

  app.get('/bad', (_req, _res, next) => {
    const err = new Error('bad request');
    err.status = 400;
    next(err);
  });

  app.get('/invalid', (_req, _res, next) => {
    const err = new Error('invalid');
    err.status = 422;
    err.details = { name: 'REQUIRED' };
    next(err);
  });

  if (useNotFound) app.use(notFound);
  app.use(handleError);
  return app;
};

describe('error-handler + correlationId (integration)', () => {
  it('400 response contains a non-empty correlationId', async () => {
    const res = await request(makeApp()).get('/bad');
    expect(res.status).toBe(400);
    expect(typeof res.body.correlationId).toBe('string');
    expect(res.body.correlationId.length).toBeGreaterThan(0);
  });

  it('422 response contains a non-empty correlationId', async () => {
    const res = await request(makeApp()).get('/invalid');
    expect(res.status).toBe(422);
    expect(typeof res.body.correlationId).toBe('string');
    expect(res.body.correlationId.length).toBeGreaterThan(0);
  });

  it('404 (via notFound) response contains a non-empty correlationId', async () => {
    const res = await request(makeApp(true)).get('/no-route-here');
    expect(res.status).toBe(404);
    expect(typeof res.body.correlationId).toBe('string');
    expect(res.body.correlationId.length).toBeGreaterThan(0);
  });

  it('without header: different requests get different correlationIds', async () => {
    const app = makeApp();
    const r1 = await request(app).get('/bad');
    const r2 = await request(app).get('/bad');
    expect(r1.body.correlationId).not.toBe(r2.body.correlationId);
  });

  it('with x-correlation-id header: preserves provided id (if supported by the middleware)', async () => {
    const app = makeApp();
    const customId = 'test-corr-12345';
    const res = await request(app)
      .get('/bad')
      .set('x-correlation-id', customId);

    // If your correlationId() middleware honors x-correlation-id, this will pass.
    // If not, remove this test or adjust the header it accepts (e.g., x-request-id).
    expect(res.status).toBe(400);
    expect(res.body.correlationId).toBe(customId);
  });
});
