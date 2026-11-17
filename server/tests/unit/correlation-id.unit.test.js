// server/tests/unit/correlation-id.unit.test.js

import { jest } from '@jest/globals';
import { Router } from 'express';
import request from 'supertest';

const randomUUIDMock = jest.fn(() => '00000000-0000-4000-8000-000000000000');

jest.unstable_mockModule('crypto', () => ({ randomUUID: randomUUIDMock }));

const { correlationId } = await import('../../middlewares/correlation-id.js');

const { makeTestApp } = await import('./makeApp.js');

function makeApp() {
  const router = Router();

  router.use(correlationId());

  router.get('/', (req, res) => {
    res.status(200).json({ correlationId: req.correlationId });
  });

  return makeTestApp(router);
}

describe('correlationId middleware', () => {
  it('prefers x-request-id over x-correlation-id', async () => {
    const app = makeApp();

    const response = await request(app).get('/').set(
      'x-request-id',
      'req-123_ABC'
    ).set(
      'x-correlation-id',
      'corr-ignored'
    ).expect(200);

    expect(response.body).toEqual({ correlationId: 'req-123_ABC' });

    expect(response.headers['x-request-id']).toBe('req-123_ABC');

    expect(randomUUIDMock).not.toHaveBeenCalled();
  });

  it('uses x-correlation-id when x-request-id is absent', async () => {
    const app = makeApp();

    const response = await request(app).get('/').set('x-correlation-id', 'corr-xyz-001').expect(200);

    expect(response.body).toEqual({ correlationId: 'corr-xyz-001' });

    expect(response.headers['x-request-id']).toBe('corr-xyz-001');

    expect(randomUUIDMock).not.toHaveBeenCalled();
  });

  it('generates an id when no incoming id is provided', async () => {
    const app = makeApp();

    const response = await request(app).get('/').expect(200);

    expect(randomUUIDMock).toHaveBeenCalledTimes(1);

    expect(response.body).toEqual({ correlationId: '00000000-0000-4000-8000-000000000000' });

    expect(response.headers['x-request-id']).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('rejects an invalid incoming id and generates a new one', async () => {
    const app = makeApp();

    const response = await request(app).get('/').set('x-request-id', 'bad id with spaces!').expect(200);

    expect(randomUUIDMock).toHaveBeenCalledTimes(1);

    expect(response.body).toEqual({ correlationId: '00000000-0000-4000-8000-000000000000' });

    expect(response.headers['x-request-id']).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('uses the first value when the incoming header is an array', () => {
    const middleware = correlationId();

    const req = { headers: { 'x-request-id': ['first-id', 'second-id'] } };

    const res = { setHeader: jest.fn() };

    const next = jest.fn();

    middleware(req, res, next);

    expect(req.correlationId).toBe('first-id');

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'first-id');

    expect(next).toHaveBeenCalledTimes(1);

    expect(randomUUIDMock).not.toHaveBeenCalled();
  });
});
