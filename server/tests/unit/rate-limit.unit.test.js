/* @jest-environment node */
import { jest } from '@jest/globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rateLimitPath = path.resolve(__dirname, '../../controllers/rate-limit.js');

/** Изолированная загрузка модуля в memory-режиме (без Redis). */
async function loadMemoryModule() {
  await jest.isolateModulesAsync(async () => {
    delete process.env.REDIS_URL;
    process.env.NODE_ENV = 'test';
    // важно: никаких моков — хотим реальное поведение RateLimiterMemory
    const mod = await import(rateLimitPath);
    Object.assign(loadMemoryModule, { mod });
  });
  return loadMemoryModule.mod;
}

/** Изолированная загрузка модуля в redis-режиме с моками. */
async function loadRedisModule() {
  // мок ioredis
  class RedisMock {
    static calls = [];
    constructor(url, options) {
      RedisMock.calls.push({ url, options });
    }
    on() {}
  }

  // мок rate-limiter-flexible (только то, что нужно)
  class RateLimiterMemoryMock {
    constructor(opts) { this.opts = opts; }
    consume() { return Promise.resolve({ remainingPoints: (this.opts?.points ?? 1) - 1, msBeforeNext: 0 }); }
    delete() { return Promise.resolve(true); }
  }

  class RateLimiterRedisMock {
    // простой shared state по keyPrefix:key
    static _counters = new Map();
    static _lastCtor = null;

    constructor(args) {
      this.opts = args;
      RateLimiterRedisMock._lastCtor = args;
    }
    _keyId(key) {
      const p = this.opts.keyPrefix || 'default';
      return `${p}:${key}`;
    }
    async consume(key) {
      const id = this._keyId(key);
      const points = this.opts.points ?? 1;
      let c = RateLimiterRedisMock._counters.get(id) ?? 0;
      c += 1;
      RateLimiterRedisMock._counters.set(id, c);
      if (c > points) {
        const err = new Error('Rate limit exceeded');
        const ttl = (this.opts.blockDuration ?? this.opts.duration ?? 1) * 1000;
        err.msBeforeNext = ttl;
        throw err;
      }
      return { remainingPoints: points - c, msBeforeNext: 0 };
    }
    async delete(key) {
      RateLimiterRedisMock._counters.delete(this._keyId(key));
      return true;
    }
  }

  await jest.isolateModulesAsync(async () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'redis://localhost:6379';

    jest.unstable_mockModule('ioredis', () => ({ default: RedisMock }));
    jest.unstable_mockModule('rate-limiter-flexible', () => ({
      RateLimiterMemory: RateLimiterMemoryMock,
      RateLimiterRedis: RateLimiterRedisMock,
    }));

    const mod = await import(rateLimitPath);
    Object.assign(loadRedisModule, { mod, RedisMock, RateLimiterRedisMock });
  });

  return { mod: loadRedisModule.mod, RedisMock: loadRedisModule.RedisMock, RateLimiterRedisMock: loadRedisModule.RateLimiterRedisMock };
}

describe('rate-limit (memory mode)', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('loginKey normalizes username', async () => {
    const m = await loadMemoryModule();
    expect(m.loginKey('  Alice ')).toBe('alice');
    expect(m.loginKey(null)).toBe('');
    expect(m.loginKey(undefined)).toBe('');
  });

  test('consumeOrInfo: ok until points are exhausted, then blocked', async () => {
    const m = await loadMemoryModule();
    const key = '1.2.3.4';

    // points=8 for signInIpLimiter
    let info;
    for (let i = 1; i <= 8; i++) {
      info = await m.consumeOrInfo(m.signInIpLimiter, key);
      expect(info.ok).toBe(true);
      expect(info.remaining).toBe(8 - i);
      expect(info.msBeforeNext).toBeGreaterThanOrEqual(0);
    }

    // 9-я попытка должна дать блок
    const blocked = await m.consumeOrInfo(m.signInIpLimiter, key);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.msBeforeNext).toBeGreaterThan(0);
  });

  test('resetKey clears consumption', async () => {
    const m = await loadMemoryModule();
    const key = 'reset-me';

    // сожрём все 8
    for (let i = 0; i < 8; i++) {
      const info = await m.consumeOrInfo(m.signInUserLimiter, key);
      expect(info.ok).toBe(true);
    }
    const blocked = await m.consumeOrInfo(m.signInUserLimiter, key);
    expect(blocked.ok).toBe(false);

    // сброс
    await m.resetKey(m.signInUserLimiter, key);

    // снова должна пройти 1 попытка
    const after = await m.consumeOrInfo(m.signInUserLimiter, key);
    expect(after.ok).toBe(true);
    expect(after.remaining).toBe(7);
  });

  test('attachLimitHeaders sets headers for success and block', async () => {
    const m = await loadMemoryModule();
    const res = { setHeader: jest.fn() };

    // успех
    m.attachLimitHeaders(res, { ok: true, remaining: 5, msBeforeNext: 0 }, { points: 10 });
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 5);

    res.setHeader.mockClear();

    // блок
    m.attachLimitHeaders(res, { ok: false, remaining: 0, msBeforeNext: 1234 }, { points: 10 });
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', Math.ceil(1234 / 1000));
  });
});

describe('rate-limit (redis mode with mocks)', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('buildLimiter in production uses Redis client and RateLimiterRedis with insuranceLimiter', async () => {
    const { mod, RedisMock, RateLimiterRedisMock } = await loadRedisModule();

    // При первом consume должен создаться Redis-клиент и RateLimiterRedis
    const info1 = await mod.consumeOrInfo(mod.signInUaLimiter, 'ua/1.0');
    expect(info1.ok).toBe(true);
    // Убедимся, что Redis вызван с правильным URL и опциями
    expect(RedisMock.calls.length).toBeGreaterThan(0);
    const { url, options } = RedisMock.calls[0];
    expect(url).toBe('redis://localhost:6379');
    expect(options).toMatchObject({
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    // Проверим, что последний конструктор Redis-лимитера получил insuranceLimiter и keyPrefix
    const ctorArgs = RateLimiterRedisMock._lastCtor;
    expect(ctorArgs).toBeTruthy();
    expect(ctorArgs.storeClient).toBeInstanceOf(RedisMock); // просто факт наличия
    expect(ctorArgs.insuranceLimiter).toBeDefined();
    expect(ctorArgs.keyPrefix).toBe('login:ua');

    // Доведём до блокировки: points=10 → 11-й вызов должен упасть
    let last;
    for (let i = 0; i < 9; i++) last = await mod.consumeOrInfo(mod.signInUaLimiter, 'ua/1.0');
    expect(last.ok).toBe(true);

    const blocked = await mod.consumeOrInfo(mod.signInUaLimiter, 'ua/1.0');
    expect(blocked.ok).toBe(false);
    expect(blocked.msBeforeNext).toBeGreaterThan(0);

    // Сброс через delete → снова пойдёт
    await mod.resetKey(mod.signInUaLimiter, 'ua/1.0');
    const after = await mod.consumeOrInfo(mod.signInUaLimiter, 'ua/1.0');
    expect(after.ok).toBe(true);
  });
});
