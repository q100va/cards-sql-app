/* @jest-environment node */

import { jest } from '@jest/globals';

function createMocks() {
  const memoryInstances = [];
  const redisLimiterInstances = [];
  const redisClients = [];

  class RateLimiterMemoryMock {
    constructor(options) {
      this.options = options;

      this.consume = jest.fn(async () =>
      ({
        remainingPoints: options.points - 1,
        msBeforeNext: 0,
      }));

      this.delete = jest.fn(async () => true);

      memoryInstances.push(this);
    }
  }

  class RateLimiterRedisMock {
    constructor(options) {
      this.options = options;

      this.consume = jest.fn(async () =>
      ({
        remainingPoints: options.points - 1,
        msBeforeNext: 0,
      }));

      this.delete = jest.fn(async () => true);

      redisLimiterInstances.push(this);
    }
  }

  class RedisMock {
    constructor(url, options) {
      this.url = url;
      this.options = options;
      this.on = jest.fn();

      redisClients.push(this);
    }
  }

  const logger = { warn: jest.fn() };

  return {
    RateLimiterMemoryMock,
    RateLimiterRedisMock,
    RedisMock,
    logger,
    memoryInstances,
    redisLimiterInstances,
    redisClients,
  };
}

async function loadRateLimit({
  nodeEnv = 'test',
  redisUrl = null,
} = {}) {
  const previousNodeEnv = process.env.NODE_ENV;

  const previousRedisUrl = process.env.REDIS_URL;

  const mocks = createMocks();

  try {
    process.env.NODE_ENV = nodeEnv;

    if (redisUrl === null) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = redisUrl;
    }

    jest.unstable_mockModule('rate-limiter-flexible', () =>
    ({
      RateLimiterMemory: mocks.RateLimiterMemoryMock,
      RateLimiterRedis: mocks.RateLimiterRedisMock,
    }));

    jest.unstable_mockModule('ioredis', () => ({ default: mocks.RedisMock }));

    jest.unstable_mockModule('../../logging/logger.js', () => ({ default: mocks.logger }));

    let mod;

    await jest.isolateModulesAsync(async () => {
      mod = await import('../../security/rate-limit.js');
    });

    return {
      mod,
      ...mocks,
    };
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = previousRedisUrl;
    }
  }
}

describe('rate-limit', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('loginKey normalizes usernames', async () => {
    const { mod } = await loadRateLimit();

    expect(mod.loginKey('  Alice ')).toBe('alice');

    expect(mod.loginKey(null)).toBe('');

    expect(mod.loginKey(undefined)).toBe('');

    expect(mod.loginKey(123)).toBe('123');
  });

  test('creates expected memory limiters outside Redis mode', async () => {
    const {
      memoryInstances,
      redisLimiterInstances,
      redisClients,
    } = await loadRateLimit();

    expect(memoryInstances).toHaveLength(4);

    expect(memoryInstances.map((instance) => instance.options)).toEqual([
      {
        keyPrefix: 'login:ip',
        points: 8,
        duration: 15 * 60,
        blockDuration: 15 * 60,
      },
      {
        keyPrefix: 'login:user',
        points: 8,
        duration: 15 * 60,
        blockDuration: 15 * 60,
      },
      {
        keyPrefix: 'login:all',
        points: 50,
        duration: 60,
        blockDuration: 60,
      },
      {
        keyPrefix: 'login:ua',
        points: 10,
        duration: 15 * 60,
        blockDuration: 15 * 60,
      },
    ]);

    expect(redisLimiterInstances).toHaveLength(0);

    expect(redisClients).toHaveLength(0);
  });

  test('memory limiter delegates consume and delete', async () => {
    const {
      mod,
      memoryInstances,
    } = await loadRateLimit();

    const ipLimiter = memoryInstances[0];

    await mod.signInIpLimiter.consume('1.2.3.4');

    expect(ipLimiter.consume).toHaveBeenCalledWith('1.2.3.4');

    await mod.signInIpLimiter.delete('1.2.3.4');

    expect(ipLimiter.delete).toHaveBeenCalledWith('1.2.3.4');
  });

  test('production with Redis creates Redis client lazily', async () => {
    const {
      mod,
      memoryInstances,
      redisLimiterInstances,
      redisClients,
    } = await loadRateLimit({
      nodeEnv: 'production',
      redisUrl: 'redis://localhost:6379',
    });

    // Insurance limiters exist
    // immediately.
    expect(memoryInstances).toHaveLength(4);

    // Redis itself is lazy.
    expect(redisClients).toHaveLength(0);

    expect(redisLimiterInstances).toHaveLength(0);

    await mod.signInUaLimiter.consume('ua/1.0');

    expect(redisClients).toHaveLength(1);

    expect(redisClients[0].url).toBe('redis://localhost:6379');

    expect(redisClients[0].options).toEqual({
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    expect(redisLimiterInstances).toHaveLength(1);

    const limiter = redisLimiterInstances[0];

    expect(limiter.options.keyPrefix).toBe('login:ua');

    expect(limiter.options.insuranceLimiter).toBe(memoryInstances[3]);

    expect(limiter.options.storeClient).toBe(redisClients[0]);
  });

  test('Redis limiter reset also clears the insurance limiter', async () => {
    const {
      mod,
      memoryInstances,
      redisLimiterInstances,
    } = await loadRateLimit({
      nodeEnv: 'production',
      redisUrl: 'redis://localhost:6379',
    });

    await mod.signInUaLimiter.consume('ua-key');

    const redisLimiter = redisLimiterInstances[0];

    const insuranceLimiter = memoryInstances[3];

    await mod.signInUaLimiter.delete('ua-key');

    expect(redisLimiter.delete).toHaveBeenCalledWith('ua-key');

    expect(insuranceLimiter.delete).toHaveBeenCalledWith('ua-key');
  });

  test('resetKey does not break login when reset fails', async () => {
    const { mod } = await loadRateLimit();

    const limiter = { delete: jest.fn().mockRejectedValue(new Error('reset failed')) };

    await expect(mod.resetKey(limiter, 'user-key')).resolves.toBeUndefined();

    expect(limiter.delete).toHaveBeenCalledWith('user-key');
  });

  test('production without REDIS_URL falls back to memory limiters', async () => {
    const {
      mod,
      memoryInstances,
      redisClients,
    } = await loadRateLimit({
      nodeEnv: 'production',
      redisUrl: null,
    });

    expect(memoryInstances).toHaveLength(4);

    await mod.signInGlobalLimiter.consume('global');

    expect(redisClients).toHaveLength(0);

    expect(memoryInstances[2].consume).toHaveBeenCalledWith('global');
  });
});
