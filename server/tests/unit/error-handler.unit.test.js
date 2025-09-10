// server/tests/unit/error-handler.unit.test.js
import { jest } from '@jest/globals';

// Мокаем логгер ДО импорта миддлвара
const loggerMock = {
  default: {
    error: jest.fn(),
  },
};
jest.unstable_mockModule('../../logging/logger.js', () => loggerMock);

const { handleError, notFound } = await import('../../middlewares/error-handler.js');
const { default: logger } = await import('../../logging/logger.js');

const makeRes = () => {
  const res = {
    headersSent: false,
    _status: null,
    _body: null,
    status: jest.fn(function (s) { this._status = s; return this; }),
    json:   jest.fn(function (b) { this._body = b;  return this; }),
  };
  return res;
};

describe('handleError (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps status to default code when err.code not provided', () => {
    const req = { method: 'GET', originalUrl: '/x', correlationId: 'cid-1' };
    const res = makeRes();

    handleError({ status: 400, message: 'bad req' }, req, res);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({
      code: 'ERRORS.BAD_REQUEST',
      data: null,
      correlationId: 'cid-1',
    });
    // лог содержит полезный payload
    expect(logger.error).toHaveBeenCalled();
    const [payload, msg] = logger.error.mock.calls[0];
    expect(payload).toMatchObject({
      code: 'ERRORS.BAD_REQUEST',
      status: 400,
      correlationId: 'cid-1',
      route: 'GET /x',
    });
    expect(msg).toBe('bad req');
  });

  it('uses err.code when provided', () => {
    const req = { method: 'POST', originalUrl: '/y' };
    const res = makeRes();

    handleError({ status: 500, code: 'FOO.BAR', message: 'boom' }, req, res);

    expect(res._status).toBe(500);
    expect(res._body.code).toBe('FOO.BAR');
  });

  it('422: includes validation details in log payload and returns JSON', () => {
    const req = { method: 'POST', originalUrl: '/z', correlationId: 'cid-422' };
    const res = makeRes();

    handleError({ status: 422, message: 'invalid', details: { field: 'REQUIRED' } }, req, res);

    expect(res._status).toBe(422);
    expect(res._body).toEqual({
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

  it('does nothing if headers already sent (short-circuit), but logs error', () => {
    const req = { method: 'GET', originalUrl: '/already' };
    const res = makeRes();
    res.headersSent = true;

    handleError({ status: 500, message: 'late' }, req, res);

    expect(logger.error).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('notFound (unit)', () => {
  it('passes 404 error with code ERRORS.NOT_FOUND to next', () => {
    const req = { method: 'GET', originalUrl: '/missing' };
    const next = jest.fn();

    notFound(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.code).toBe('ERRORS.NOT_FOUND');
  });
});
