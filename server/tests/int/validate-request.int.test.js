// tests/validate-request.integration.test.js
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validateRequest } from '../../middlewares/validate-request.js';
import { handleError } from '../../middlewares/error-handler.js';

// (опционально, если хочешь проверить correlationId)
import { correlationId } from '../../middlewares/correlation-id.js';
import { withRequestContext } from '../../middlewares/request-context.js';

describe('validateRequest + handleError (integration)', () => {
  const bodySchema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
  });

  const querySchema = z.object({
    q: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(100),
  });

  const makeApp = (opts = {}) => {
    const app = express();
    app.use(express.json());
    // (опционально)
    app.use(correlationId());
    app.use(withRequestContext);

    if (opts.route === 'query') {
      app.get('/x', validateRequest(querySchema, 'query'), (req, res) => {
        res.json({ ok: true, data: req.query });
      });
    } else {
      app.post('/x', validateRequest(bodySchema, 'body'), (req, res) => {
        res.json({ ok: true, data: req.body });
      });
    }

    app.use(handleError);
    return app;
  };

  it('200 on valid body', async () => {
    const res = await request(makeApp()).post('/x').send({ name: 'Alice', age: '20' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { name: 'Alice', age: 20 } }); // age coerced
  });

  it('422 JSON on invalid body (from handleError)', async () => {
    const res = await request(makeApp()).post('/x').send({ name: '', age: -1 });

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
    // Если реально подключён correlationId middleware выше:
    expect(typeof res.body.correlationId).toBe('string');
    expect(res.body.correlationId.length).toBeGreaterThan(0);
  });

  // NEW: runtime exception inside validator → catch-ветка выставляет 422 + ERRORS.VALIDATION
  it('422 when validator throws at runtime (catch branch)', async () => {
    // подменяем схему на объект, чей safeParse кидает исключение
    const throwingSchema = { safeParse: () => { throw new Error('kaboom'); } };
    const app = express();
    app.use(express.json());
    app.post('/x', validateRequest(throwingSchema, 'body'), (req, res) => {
      res.json({ ok: true }); // недостижимо
    });
    app.use(handleError);

    const res = await request(app).post('/x').send({ name: 'Bob', age: '10' });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  // NEW: validate query part and check coercion
  it('200 on valid query; values are coerced', async () => {
    const res = await request(makeApp({ route: 'query' }))
      .get('/x')
      .query({ q: 'hello', limit: '5' }); // строка

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { q: 'hello', limit: 5 } }); // число
  });
});
