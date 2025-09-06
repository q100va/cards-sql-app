// server/tests/int/correlation-id.int.test.js
import express from 'express';
import request from 'supertest';
import { correlationId } from '../../middlewares/correlation-id.js';
import { handleError } from '../../middlewares/error-handler.js';

const makeApp = () => {
  const app = express();
  app.use(correlationId());
  app.get('/ping', (req, res) => res.status(200).json({ id: req.correlationId }));
  app.get('/err', (_req, _res, next) => next(Object.assign(new Error('x'), { status: 500 })));
  app.use(handleError);
  return app;
};

describe('correlationId middleware', () => {
  it('uses x-request-id when both headers provided (priority order)', async () => {
    const app = makeApp();
    const rid = 'req-123_ABC';
    const cid = 'corr-should-be-ignored';
    const res = await request(app)
      .get('/ping')
      .set('x-request-id', rid)
      .set('x-correlation-id', cid);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(rid);
    expect(res.headers['x-request-id']).toBe(rid); // response header set
  });

  it('accepts x-correlation-id when x-request-id is absent', async () => {
    const app = makeApp();
    const cid = 'corr-xyz-001';
    const res = await request(app).get('/ping').set('x-correlation-id', cid);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cid);
    expect(res.headers['x-request-id']).toBe(cid);
  });

  it('rejects invalid header (not matching ALLOWED) and generates a UUID', async () => {
    const app = makeApp();
    const bad = 'bad id with spaces!';
    const res = await request(app).get('/ping').set('x-request-id', bad);

    expect(res.status).toBe(200);
    // should NOT echo the invalid value
    expect(res.body.id).not.toBe(bad);
    // randomUUID() → 36 chars with dashes; looser check is fine too
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(res.headers['x-request-id']).toBe(res.body.id);
  });

  it('propagates the same id into error responses as well', async () => {
    const app = makeApp();
    const rid = 'req-ERR-77';
    const res = await request(app).get('/err').set('x-request-id', rid);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.correlationId).toBe(rid);
    expect(res.headers['x-request-id']).toBe(rid);
  });
});
