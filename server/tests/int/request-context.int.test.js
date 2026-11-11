import express from 'express';
import request from 'supertest';

import { correlationId } from '../../middlewares/correlation-id.js';
import { withRequestContext, getRequestContext } from '../../middlewares/request-context.js';
import { handleError } from '../../middlewares/error-handler.js';

function makeApp() {
  const app = express();

  app.use(correlationId());
  app.use(withRequestContext);

  app.get('/context', async (_req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    await Promise.resolve();

    res.json(getRequestContext());
  });

  app.get('/error', async (_req, _res, next) => {
    await new Promise((resolve) => setTimeout(resolve, 5));

    const context = getRequestContext();
    const error = new Error('boom');
    error.status = 500;
    error.contextCorrelationId = context.correlationId;

    next(error);
  });

  app.use((error, _req, res, next) => {
    res.set('x-context-id', error.contextCorrelationId ?? '');
    next(error);
  });

  app.use(handleError);

  return app;
}

describe('request context', () => {
  test('preserves context across async boundaries', async () => {
    const res = await request(makeApp())
      .get('/context')
      .set('x-correlation-id', 'context-1')
      .set('user-agent', 'Jest-UA');

    expect(res.status).toBe(200);
    expect(res.body.correlationId).toBe('context-1');
    expect(res.body.userAgent).toBe('Jest-UA');
    expect(typeof res.body.ip).toBe('string');
  });

  test('isolates concurrent request contexts', async () => {
    const app = makeApp();

    const [first, second] = await Promise.all([
      request(app).get('/context').set('x-correlation-id', 'context-A'),
      request(app).get('/context').set('x-correlation-id', 'context-B'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.correlationId).toBe('context-A');
    expect(second.body.correlationId).toBe('context-B');
  });

  test('keeps context on async error path', async () => {
    const res = await request(makeApp()).get('/error').set('x-correlation-id', 'context-error');

    expect(res.status).toBe(500);
    expect(res.headers['x-context-id']).toBe('context-error');
    expect(res.body.correlationId).toBe('context-error');
  });
});
