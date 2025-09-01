// tests/validate-request.integration.test.js
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validate-request.js';
import { handleError } from '../middlewares/error-handler.js';

describe('validateRequest + handleError (integration)', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
  });

  const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.post('/x', validateRequest(schema, 'body'), (req, res) => {
      res.json({ ok: true, data: req.body });
    });
    app.use(handleError);
    return app;
  };

  it('200 on valid body', async () => {
    const res = await request(makeApp()).post('/x').send({ name: 'Alice', age: '20' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { name: 'Alice', age: 20 } });
  });

  it('400 JSON on invalid body (from handleError)', async () => {
    const res = await request(makeApp()).post('/x').send({ name: '', age: -1 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body).toMatchObject({
      message: 'Неверный формат данных запроса.',
      code: null,
    });
    // опционально проверить presence correlationId, если в тестовом app подключён middleware
    expect('correlationId' in res.body).toBe(true);
  });
});
