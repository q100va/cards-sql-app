// server/security/rate-limit.js
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';

//import Redis from 'ioredis';

const useRedis = process.env.NODE_ENV === 'production' && !!process.env.REDIS_URL;

let redis = null; // общий клиент

async function getRedis() {
  if (redis) return redis;
  const { default: Redis } = await import('ioredis');   // ← динамический импорт
  redis = new Redis(process.env.REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  redis.on('error', (e) => console.error('[rate-limit] redis error:', e?.message));
  return redis;
}

function buildLimiter(opts) {
  if (!useRedis) {
    const mem = new RateLimiterMemory(opts);
    return {
      consume: (key) => mem.consume(key),
      delete: (key) => mem.delete(key),
    };
  }

  return {
    async consume(key) {
      const insurance = new RateLimiterMemory(opts);
      const storeClient = await getRedis();
      const limiter = new RateLimiterRedis({ storeClient, insuranceLimiter: insurance, ...opts });
      return limiter.consume(key);
    },
    async delete(key) {
      const storeClient = await getRedis();
      const limiter = new RateLimiterRedis({ storeClient, ...opts });
      try { await limiter.delete(key); } catch {}
    },
  };
}

// Лимитеры
export const signInIpLimiter = buildLimiter({
  keyPrefix: 'login:ip',
  points: 8,
  duration: 900,      // 15m
  blockDuration: 900, // 15m
});

export const signInUserLimiter = buildLimiter({
  keyPrefix: 'login:user',
  points: 8,
  duration: 900,       // 15m
  blockDuration: 900,  // 15m
});

export const signInGlobalLimiter = buildLimiter({
  keyPrefix: 'login:all',
  points: 50,
  duration: 60,     // 1m
  blockDuration: 900
});

export const signInUaLimiter = buildLimiter({
  keyPrefix: 'login:ua',
  points: 10,
  duration: 900,    // 15m
  blockDuration: 900
});

// Утилиты
export function loginKey(userName) {
  return String(userName ?? '').trim().toLowerCase();
}

export async function consumeOrInfo(limiter, key) {
  try {
    const r = await limiter.consume(key);
    return { ok: true, remaining: r.remainingPoints, msBeforeNext: r.msBeforeNext };
  } catch (rej) {
    return { ok: false, remaining: 0, msBeforeNext: rej.msBeforeNext ?? 0 };
  }
}

export function attachLimitHeaders(res, info, limiterCfg) {
  if (!info) return;
  if (info.ok) {
    res.setHeader('X-RateLimit-Limit', limiterCfg.points);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
  } else {
    const retrySec = Math.ceil(info.msBeforeNext / 1000);
    res.setHeader('Retry-After', retrySec);
  }
}

export async function resetKey(limiter, key) {
  try { await limiter.delete(key); } catch { /* ignore */ }
}


