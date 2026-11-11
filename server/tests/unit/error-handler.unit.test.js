import { jest } from '@jest/globals';
import { Router } from 'express';
import request from 'supertest';

const loggerMock = { default: { error: jest.fn() } };

jest.unstable_mockModule('../../logging/logger.js', () => loggerMock);

const {
  handleError,
  notFound,
} = await import('../../middlewares/error-handler.js');

const { default: logger } = await import('../../logging/logger.js');

const { makeTestApp } = await import('./makeApp.js');

describe('handleError', () => {
  it('maps status to default code and returns the standard error response', async () => {
    const router = Router();

    router.get('/x', (req, res, next) => {
      req.correlationId = 'cid-1';

      const error = new Error('bad req');

      error.status = 400;

      next(error);
    });

    const app = makeTestApp(router);

    const response = await request(app).get('/x?foo=bar').expect(400);

    expect(response.body).toEqual({
      code: 'ERRORS.BAD_REQUEST',
      data: null,
      correlationId: 'cid-1',
    });

    expect(logger.error).toHaveBeenCalledTimes(1);

    const [payload, message] = logger.error.mock.calls[0];

    expect(payload).toMatchObject({
      code: 'ERRORS.BAD_REQUEST',
      status: 400,
      correlationId: 'cid-1',
      route: 'GET /x',
    });

    expect(message).toBe('bad req');
  });

  it('uses error code when one is provided', async () => {
    const router = Router();

    router.post('/y', (req, res, next) => {
      const error = new Error('boom');

      error.status = 500;
      error.code = 'FOO.BAR';

      next(error);
    });

    const app = makeTestApp(router);

    const response = await request(app).post('/y').expect(500);

    expect(response.body).toEqual({
      code: 'FOO.BAR',
      data: null,
      correlationId: null,
    });
  });

  it('logs validation details for 422 errors', async () => {
    const router = Router();

    router.post('/z', (req, res, next) => {
      req.correlationId = 'cid-422';

      const error = new Error('invalid');

      error.status = 422;
      error.details = { field: 'REQUIRED' };

      next(error);
    });

    const app = makeTestApp(router);

    const response = await request(app).post('/z').expect(422);

    expect(response.body).toEqual({
      code: 'ERRORS.VALIDATION',
      data: null,
      correlationId: 'cid-422',
    });

    const [payload] = logger.error.mock.calls[0];

    expect(payload).toMatchObject({
      code: 'ERRORS.VALIDATION',
      status: 422,
      correlationId: 'cid-422',
      validation: { field: 'REQUIRED' },
    });
  });

  it('normalizes invalid status values to 500', async () => {
    const router = Router();

    router.get('/bad-status', (req, res, next) => {
      const error = new Error('unexpected');

      error.status = 999;

      next(error);
    });

    const app = makeTestApp(router);

    const response = await request(app).get('/bad-status').expect(500);

    expect(response.body.code).toBe('ERRORS.UNKNOWN');
  });

  it('forwards the error when headers were already sent', () => {
    const error = new Error('late');

    error.status = 500;

    const req = {
      method: 'GET',
      originalUrl: '/already',
    };

    const res = {
      headersSent: true,
      status: jest.fn(),
      json: jest.fn(),
    };

    const next = jest.fn();

    handleError(error, req, res, next);

    expect(logger.error).toHaveBeenCalledTimes(1);

    expect(res.status).not.toHaveBeenCalled();

    expect(res.json).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledTimes(1);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('notFound', () => {
  it('returns the standard 404 response for an unknown route', async () => {
    const router = Router();

    router.use(notFound);

    const app = makeTestApp(router);

    const response = await request(app).get('/missing').expect(404);

    expect(response.body).toEqual({
      code: 'ERRORS.NOT_FOUND',
      data: null,
      correlationId: null,
    });
  });
});
