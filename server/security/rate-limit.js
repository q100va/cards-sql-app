import {
  RateLimiterMemory,
  RateLimiterRedis,
} from 'rate-limiter-flexible';
import logger from '../logging/logger.js';

const useRedis =
  process.env.NODE_ENV === 'production' &&
  Boolean(process.env.REDIS_URL);

let redis = null;
let redisPromise = null;

async function getRedis() {
  if (redis) {
    return redis;
  }

  if (!redisPromise) {
    redisPromise = import('ioredis')
      .then(({ default: Redis }) => {
        redis = new Redis(
          process.env.REDIS_URL,
          {
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
          },
        );

        redis.on('error', (error) => {
          logger.warn(
            { err: error },
            '[rate-limit] Redis error',
          );
        });

        return redis;
      })
      .catch((error) => {
        redisPromise = null;
        throw error;
      });
  }

  return redisPromise;
}

function buildLimiter(options) {
  if (!useRedis) {
    const limiter =
      new RateLimiterMemory(options);

    return {
      consume: (key) =>
        limiter.consume(key),

      delete: (key) =>
        limiter.delete(key),
    };
  }

  const insuranceLimiter =
    new RateLimiterMemory(options);

  let limiterPromise = null;

  async function getLimiter() {
    if (!limiterPromise) {
      limiterPromise = getRedis()
        .then(
          (storeClient) =>
            new RateLimiterRedis({
              ...options,
              storeClient,
              insuranceLimiter,
            }),
        )
        .catch((error) => {
          limiterPromise = null;
          throw error;
        });
    }

    return limiterPromise;
  }

  return {
    async consume(key) {
      const limiter =
        await getLimiter();

      return limiter.consume(key);
    },

    async delete(key) {
      try {
        const limiter =
          await getLimiter();

        await limiter.delete(key);
      } catch {
        // Redis reset is best-effort.
      }

      try {
        await insuranceLimiter.delete(key);
      } catch {
        // Memory reset is best-effort.
      }
    },
  };
}

export const signInIpLimiter =
  buildLimiter({
    keyPrefix: 'login:ip',
    points: 8,
    duration: 15 * 60,
    blockDuration: 15 * 60,
  });

export const signInUserLimiter =
  buildLimiter({
    keyPrefix: 'login:user',
    points: 8,
    duration: 15 * 60,
    blockDuration: 15 * 60,
  });

export const signInGlobalLimiter =
  buildLimiter({
    keyPrefix: 'login:all',
    points: 50,
    duration: 60,
    blockDuration: 60,
  });

export const signInUaLimiter =
  buildLimiter({
    keyPrefix: 'login:ua',
    points: 10,
    duration: 15 * 60,
    blockDuration: 15 * 60,
  });

export function loginKey(userName) {
  return String(userName ?? '')
    .trim()
    .toLowerCase();
}

export async function resetKey(
  limiter,
  key,
) {
  try {
    await limiter.delete(key);
  } catch {
    // Reset failure must not break login.
  }
}
