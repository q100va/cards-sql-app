import express from 'express';
import request from 'supertest';

import { correlationId } from '../../middlewares/correlation-id.js';
import { withRequestContext, getRequestContext } from '../../middlewares/request-context.js';
import { handleError } from '../../middlewares/error-handler.js';

const makeApp = () => {
  const app = express();
  app.use(correlationId());
  app.use(withRequestContext);

  // Async boundaries: micro + macro + promise
  app.get('/ctx', async (_req, res) => {
    await new Promise(r => setTimeout(r, 5));
    await Promise.resolve();
    const ctx = getRequestContext();
    res.json({ ctx });
  });

  // Same, but throws, to ensure context visible in error-handler too
  app.get('/boom', async (_req, _res, next) => {
    await new Promise(r => setTimeout(r, 1));
    const err = new Error('boom');
    err.status = 500;
    next(err);
  });

  app.use(handleError);
  return app;
};

describe('withRequestContext + AsyncLocalStorage (integration)', () => {
  it('keeps request context across async boundaries', async () => {
    const ua = 'Jest-UA';
    const custom = 'corr-A';

    const res = await request(makeApp())
      .get('/ctx')
      .set('user-agent', ua)
      .set('x-correlation-id', custom);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ctx');

    const { ctx } = res.body;
    expect(ctx.correlationId).toBe(custom);     // preserved from header via correlationId()
    expect(ctx.userAgent).toBe(ua);             // captured by withRequestContext
    expect(typeof ctx.ip).toBe('string');       // Express computes something like ::ffff:127.0.0.1
  });

  it('isolates context between concurrent requests', async () => {
    const app = makeApp();
    const A = 'corr-A';
    const B = 'corr-B';

    const [r1, r2] = await Promise.all([
      request(app).get('/ctx').set('x-correlation-id', A),
      request(app).get('/ctx').set('x-correlation-id', B),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.ctx.correlationId).toBe(A);
    expect(r2.body.ctx.correlationId).toBe(B);
  });

  it('context is available inside error handler path as well', async () => {
    const custom = 'corr-ERR';
    const res = await request(makeApp())
      .get('/boom')
      .set('x-correlation-id', custom);

    expect(res.status).toBeGreaterThanOrEqual(500);
    // error-handler replies with correlationId from req; if ALS lost it, это бы упало
    expect(res.body).toHaveProperty('correlationId', custom);
  });
});
