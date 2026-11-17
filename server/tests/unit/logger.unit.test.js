/** @jest-environment node */

import { jest } from '@jest/globals';

const originalNodeEnv = process.env.NODE_ENV;

const originalLogLevel = process.env.LOG_LEVEL;

async function loadLogger({
  nodeEnv,
  logLevel,
} = {}) {
  jest.resetModules();

  if (nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnv;
  }

  if (logLevel === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = logLevel;
  }

  const loggerInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const isoTime = jest.fn();

  const pinoMock = jest.fn(() => loggerInstance);

  pinoMock.stdTimeFunctions = { isoTime };

  jest.unstable_mockModule('pino', () => ({ default: pinoMock }));

  const { default: logger } = await import('../../logging/logger.js');

  return {
    logger,
    loggerInstance,
    pinoMock,
    isoTime,
  };
}

describe('logger configuration', () => {
  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('uses development defaults outside production', async () => {
    const {
      logger,
      loggerInstance,
      pinoMock,
      isoTime,
    } = await loadLogger({ nodeEnv: 'development' });

    expect(logger).toBe(loggerInstance);

    expect(pinoMock).toHaveBeenCalledTimes(1);

    const [options] = pinoMock.mock.calls[0];

    expect(options.level).toBe('debug');

    expect(options.base).toEqual({
      app: 'cards-sql-app',
      env: 'development',
    });

    expect(options.timestamp).toBe(isoTime);

    expect(options.transport).toEqual({
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        translateTime: 'SYS:standard',
        messageKey: 'msg',
      },
    });
  });

  test('uses production defaults without pretty transport', async () => {
    const { pinoMock } = await loadLogger({ nodeEnv: 'production' });

    const [options] = pinoMock.mock.calls[0];

    expect(options.level).toBe('info');

    expect(options.base).toEqual({
      app: 'cards-sql-app',
      env: 'production',
    });

    expect(options).not.toHaveProperty('transport');
  });

  test('uses development as the environment when NODE_ENV is missing', async () => {
    const { pinoMock } = await loadLogger();

    const [options] = pinoMock.mock.calls[0];

    expect(options.base.env).toBe('development');

    expect(options.level).toBe('debug');
  });

  test('uses trimmed LOG_LEVEL override', async () => {
    const { pinoMock } = await loadLogger({
      nodeEnv: 'production',
      logLevel: '  warn  ',
    });

    const [options] = pinoMock.mock.calls[0];

    expect(options.level).toBe('warn');
  });

  test('falls back to environment default when LOG_LEVEL is blank', async () => {
    const { pinoMock } = await loadLogger({
      nodeEnv: 'production',
      logLevel: '   ',
    });

    const [options] = pinoMock.mock.calls[0];

    expect(options.level).toBe('info');
  });

  test('removes configured sensitive fields from logs', async () => {
    const { pinoMock } = await loadLogger({ nodeEnv: 'production' });

    const [options] = pinoMock.mock.calls[0];

    expect(options.redact).toEqual({
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', 'req.body.password', 'req.body.email', 'body.email'],
      remove: true,
    });
  });
});
