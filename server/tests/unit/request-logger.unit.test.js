/** @jest-environment node */

import { jest } from '@jest/globals';

const baseLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const defaultMiddleware = jest.fn();

const pinoHttpMock = jest.fn(() => defaultMiddleware);

jest.unstable_mockModule('pino-http', () => ({ default: pinoHttpMock }));

jest.unstable_mockModule('../../logging/logger.js', () => ({ default: baseLogger }));

const {
  default: requestLogger,
  requestLoggerOptions,
  buildRequestLogger,
} = await import('../../middlewares/request-logger.js');

describe('request-logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds the default request logger on module load', () => {
    expect(requestLogger).toBe(defaultMiddleware);
  });

  test('reuses the correlation ID as the request ID', () => {
    const req = { correlationId: 'corr-123' };

    expect(requestLoggerOptions.genReqId(req)).toBe('corr-123');

    expect(requestLoggerOptions.customProps(req)).toEqual({ correlationId: 'corr-123' });
  });

  test('returns null correlationId in custom props when it is missing', () => {
    expect(requestLoggerOptions.customProps({})).toEqual({ correlationId: null });
  });

  test.each([[200, null, 'info'], [399, null, 'info'], [400, null, 'warn'], [499, null, 'warn'], [500, null, 'error'], [503, null, 'error'], [200, new Error('boom'), 'error']])(
    'selects the expected log level for status %s',
    (statusCode, error, expected) => {
      expect(requestLoggerOptions.customLogLevel({}, { statusCode }, error)).toBe(expected);
    });

  test('success message uses path without query string', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/users?page=2&limit=20',
      url: '/ignored',
    };

    const res = { statusCode: 200 };

    expect(requestLoggerOptions.customSuccessMessage(req, res)).toBe('GET /api/users → 200');
  });

  test('falls back to req.url when originalUrl is unavailable', () => {
    const req = {
      method: 'POST',
      url: '/api/session/sign-in?debug=true',
    };

    const res = { statusCode: 204 };

    expect(requestLoggerOptions.customSuccessMessage(req, res)).toBe('POST /api/session/sign-in → 204');
  });

  test('error message excludes query string and includes error message', () => {
    const req = {
      method: 'PATCH',
      originalUrl: '/api/users/7?secret=value',
    };

    const res = { statusCode: 500 };

    expect(requestLoggerOptions.customErrorMessage(
      req,
      res,
      new Error('database failed')
    )).toBe('ERROR PATCH /api/users/7 → 500: database failed');
  });

  test('error message has safe fallbacks', () => {
    expect(requestLoggerOptions.customErrorMessage({
      method: 'GET',
      url: '/api/test?token=secret',
    }, { statusCode: 0 }, undefined)).toBe('ERROR GET /api/test → 500: Unknown error');
  });

  test('request serializer exposes only safe request metadata', () => {
    const serialized = requestLoggerOptions.serializers.req({
      correlationId: 'corr-789',
      method: 'GET',
      originalUrl: '/api/users?email=user@example.com',
      url: '/ignored',
      ip: '127.0.0.1',
      headers: {
        authorization: 'Bearer secret',
        cookie: 'sid=secret',
      },
    });

    expect(serialized).toEqual({
      id: 'corr-789',
      method: 'GET',
      path: '/api/users',
      ip: '127.0.0.1',
    });

    expect(serialized).not.toHaveProperty('headers');
  });

  test('response serializer exposes only statusCode', () => {
    expect(requestLoggerOptions.serializers.res({
      statusCode: 404,
      secret: 'do-not-log',
    })).toEqual({ statusCode: 404 });
  });

  test('buildRequestLogger supports injected pino-http implementation and logger', () => {
    const middleware = jest.fn();

    const pinoHttpImpl = jest.fn(() => middleware);

    const injectedLogger = { info: jest.fn() };

    const result = buildRequestLogger(pinoHttpImpl, injectedLogger);

    expect(result).toBe(middleware);

    expect(pinoHttpImpl).toHaveBeenCalledTimes(1);

    expect(pinoHttpImpl).toHaveBeenCalledWith(expect.objectContaining({
      logger: injectedLogger,
      genReqId: requestLoggerOptions.genReqId,
      wrapSerializers: false,
      customProps: requestLoggerOptions.customProps,
      customLogLevel: requestLoggerOptions.customLogLevel,
      serializers: requestLoggerOptions.serializers,
    }));
  });
});
