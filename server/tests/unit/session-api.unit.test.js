/* @jest-environment node */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = 'acc-secret';
const REFRESH_SECRET = 'ref-secret';
const ACCESS_TTL_SEC = 900;

function makeLimiter() {
  return {
    consume: jest.fn().mockResolvedValue({
      remainingPoints: 1,
      msBeforeNext: 0,
    }),
    delete: jest.fn().mockResolvedValue(true),
  };
}

function makeRateLimiterMock() {
  return {
    signInIpLimiter: makeLimiter(),
    signInUserLimiter: makeLimiter(),
    signInUaLimiter: makeLimiter(),
    signInGlobalLimiter: makeLimiter(),
    resetKey: jest.fn().mockResolvedValue(undefined),
    loginKey: (value) => String(value ?? '').trim().toLowerCase(),
  };
}

function makeModelsMock() {
  return {
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
    Role: {},
    RefreshToken: { findOne: jest.fn() },
  };
}

function makeMockUser(initial = {}) {
  return {
    id: 1,
    userName: 'user',
    firstName: 'First',
    lastName: 'Last',
    password: 'HASH',
    roleId: 2,
    role: {
      id: 2,
      name: 'USER',
    },
    isRestricted: false,
    failedLoginCount: 0,
    lockedUntil: null,
    bruteWindowStart: null,
    bruteStrikeCount: 0,
    resetAfterSuccess: jest.fn().mockResolvedValue({ touched: false }),
    registerFailedLogin: jest.fn().mockResolvedValue({
      events: [],
      state: {
        failedLoginCount: 1,
        lockedUntil: null,
        bruteWindowStart: null,
        bruteStrikeCount: 0,
      },
    }),
    ...initial,
  };
}

function makeRefreshToken({
  sub = 1,
  jti = 'jti-1',
  expSec = Math.floor(Date.now() / 1000) + 3600,
} = {}) {
  const payload = {};

  if (sub !== undefined) {
    payload.sub = String(sub);
  }

  if (jti !== undefined) {
    payload.jti = jti;
  }

  if (expSec !== undefined) {
    payload.exp = expSec;
  }

  return jwt.sign(payload, REFRESH_SECRET, {
    algorithm: 'HS256',
    issuer: 'cards-sql-app',
    audience: 'web',
  });
}

function makeTokensMock() {
  const mintTokenPair = jest.fn(async (user) =>
  ({
    accessToken: 'access-token',
    refreshToken: makeRefreshToken({
      sub: user.id,
      jti: 'new-jti-123',
    }),
  }));

  const setRefreshCookie = jest.fn((res, token) => {
    res.cookie('rt', token, {
      httpOnly: true,
      path: '/api/session',
    });
  });

  const clearRefreshCookie = jest.fn((res) => {
    res.clearCookie('rt', { path: '/api/session' });
  });

  return {
    ACCESS_TTL_SEC,
    REFRESH_SECRET,
    mintTokenPair,
    setRefreshCookie,
    clearRefreshCookie,
  };
}

function makePasswordsMock() {
  return {
    verify: jest.fn().mockResolvedValue(true),
    DUMMY_ARGON2_HASH: 'dummy-argon2-hash',
  };
}

function makeAuditMock() {
  return { auditAuthEvent: jest.fn().mockResolvedValue(undefined) };
}

function makeSequelizeMock() {
  const transactionObject = { LOCK: { UPDATE: 'UPDATE' } };

  return {
    __transaction: transactionObject,
    transaction: jest.fn(async (callback) => callback(transactionObject)),
  };
}

function makeRequireAuthMock() {
  return jest.fn((req, _res, next) => {
    req.user = { id: Number(req.headers['x-test-user-id'] ?? 5) };

    next();
  });
}

async function loadApp({
  rateLimiter = makeRateLimiterMock(),
  models = makeModelsMock(),
  tokens = makeTokensMock(),
  passwords = makePasswordsMock(),
  audit = makeAuditMock(),
  sequelize = makeSequelizeMock(),
  requireAuth = makeRequireAuthMock(),
} = {}) {
  let app;

  await jest.isolateModulesAsync(async () => {
    jest.unstable_mockModule('../../database.js', () => ({ default: sequelize }));

    jest.unstable_mockModule('../../middlewares/check-auth.js', () => ({ default: requireAuth }));

    jest.unstable_mockModule('../../middlewares/validate-request.js', () =>
    ({
      validateRequest: () => (_req, _res, next) => next(),
    }));

    jest.unstable_mockModule('../../../shared/dist/schemas/auth.schema.js', () =>
    ({
      signInReqSchema: {},
    }));

    jest.unstable_mockModule('../../audit/audit-auth.js', () => audit);

    jest.unstable_mockModule('../../security/passwords.mjs', () => passwords);

    jest.unstable_mockModule('../../security/rate-limit.js', () => rateLimiter);

    jest.unstable_mockModule('../../controllers/token.js', () => tokens);

    jest.unstable_mockModule('../../models/index.js', () => models);

    const { default: router } = await import('../../routes/session-api.js');

    app = express();

    app.use(express.json());

    app.use(cookieParser());

    app.use('/api/session', router);

    app.use((error, _req, res, _next) => {
      res.status(error.status ?? 500).json({
        code: error.code ?? 'ERRORS.INTERNAL',
        data: null,
      });
    });
  });

  return {
    app,
    mocks: {
      rateLimiter,
      models,
      tokens,
      passwords,
      audit,
      sequelize,
      requireAuth,
    },
  };
}

describe('routes: /api/session', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('POST /sign-in', () => {
    test('signs in a valid user and creates a session', async () => {
      const models = makeModelsMock();

      const user = makeMockUser({
        id: 10,
        userName: 'Alice',
        firstName: 'A',
        lastName: 'L',
        roleId: 1,
        role: {
          id: 1,
          name: 'ADMIN',
        },
        failedLoginCount: 2,
      });

      models.User.findOne.mockResolvedValue(user);

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const response = await request(app).post('/api/session/sign-in').set('user-agent', 'UA/1.0').send({
        userName: 'Alice',
        password: 'p@ss12345',
      }).expect(200);

      expect(response.body.data).toMatchObject({
        user: {
          id: 10,
          userName: 'Alice',
          firstName: 'A',
          lastName: 'L',
          roleName: 'ADMIN',
          roleId: 1,
        },
        token: 'access-token',
        expiresIn: ACCESS_TTL_SEC,
      });

      expect(mocks.passwords.verify).toHaveBeenCalledWith('HASH', 'p@ss12345');

      expect(user.resetAfterSuccess).toHaveBeenCalledTimes(1);

      expect(mocks.rateLimiter.resetKey).toHaveBeenCalledWith(mocks.rateLimiter.signInUserLimiter, 'alice');

      expect(mocks.tokens.mintTokenPair).toHaveBeenCalledWith(user, expect.objectContaining({
        ua: 'UA/1.0',
        ip: expect.any(String),
      }));

      expect(mocks.tokens.setRefreshCookie).toHaveBeenCalled();

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), {
        event: 'login_success',
        userId: 10,
      });

      expect(response.headers['set-cookie']?.join(';') ?? '').toMatch(/rt=/);
    });

    test.each([['signInUserLimiter', 'user_rate_limit'], ['signInIpLimiter', 'ip_rate_limit'], ['signInUaLimiter', 'ua_rate_limit'], ['signInGlobalLimiter', 'global_rate_limit']])(
      '%s returns 429 when blocked',
      async (limiterName, reason) => {
        const rateLimiter = makeRateLimiterMock();

        rateLimiter[limiterName].consume.mockRejectedValue({ msBeforeNext: 5000 });

        const models = makeModelsMock();

        const {
          app,
          mocks,
        } = await loadApp({
          rateLimiter,
          models,
        });

        const response = await request(app).post('/api/session/sign-in').send({
          userName: 'Alice',
          password: 'password',
        }).expect(429);

        expect(response.headers['retry-after']).toBe('5');

        expect(response.body).toEqual({
          code: 'ERRORS.TOO_MANY_ATTEMPTS',
          data: { retryAfterSec: 5 },
        });

        expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          event: 'login_blocked',
          reason,
        }));

        expect(models.User.findOne).not.toHaveBeenCalled();
      });

    test('uses dummy password verification for an unknown user', async () => {
      const models = makeModelsMock();

      models.User.findOne.mockResolvedValue(null);

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const response = await request(app).post('/api/session/sign-in').send({
        userName: 'missing',
        password: 'password',
      }).expect(401);

      expect(mocks.passwords.verify).toHaveBeenCalledWith(mocks.passwords.DUMMY_ARGON2_HASH, 'password');

      expect(response.body).toEqual({
        code: 'ERRORS.INVALID_AUTHORIZATION',
        data: null,
      });

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        event: 'login_failed',
        reason: 'unknown_user',
        entityId: 'missing',
      }));

      expect(mocks.tokens.mintTokenPair).not.toHaveBeenCalled();
    });

    test.each([
      ['restricted', { isRestricted: true }, 423, 'ERRORS.ACCOUNT_RESTRICTED', 'user_restricted'],
      [
        'locked',
        {
          lockedUntil: new Date(Date.now() + 60_000),
        },
        423,
        'ERRORS.ACCOUNT_LOCKED',
        'user_locked',
      ],
    ])('blocks a %s user before password verification', async (_label, state, status, code, reason) => {
      const models = makeModelsMock();

      models.User.findOne.mockResolvedValue(makeMockUser(state));

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const response = await request(app).post('/api/session/sign-in').send({
        userName: 'Alice',
        password: 'password',
      }).expect(status);

      expect(response.body.code).toBe(code);

      expect(mocks.passwords.verify).not.toHaveBeenCalled();

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        event: 'login_blocked',
        reason,
      }));
    });

    test('records a failed password and handles lock/restriction events', async () => {
      const models = makeModelsMock();

      const now = new Date();

      const user = makeMockUser({
        id: 10,
        registerFailedLogin: jest.fn().mockResolvedValue({
          events: ['locked', 'restricted'],
          state: {
            failedLoginCount: 0,
            lockedUntil: now,
            bruteStrikeCount: 3,
            bruteWindowStart: now,
          },
        }),
      });

      models.User.findOne.mockResolvedValue(user);

      const passwords = makePasswordsMock();

      passwords.verify.mockResolvedValue(false);

      const {
        app,
        mocks,
      } = await loadApp({
        models,
        passwords,
      });

      await request(app).post('/api/session/sign-in').send({
        userName: 'Alice',
        password: 'wrong',
      }).expect(401);

      expect(user.registerFailedLogin).toHaveBeenCalledWith(expect.any(Date));

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        event: 'user_locked',
        reason: 'failed_login_threshold',
      }));

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        event: 'user_restricted',
        reason: 'daily_lockout',
      }));

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        event: 'login_failed',
        reason: 'bad_password',
        details: { attemptsLeft: 0 },
      }));

      expect(mocks.tokens.mintTokenPair).not.toHaveBeenCalled();
    });
  });

  describe('POST /refresh', () => {
    test('rotates a valid refresh token atomically', async () => {
      const models = makeModelsMock();

      const user = makeMockUser({
        id: 2,
        userName: 'refUser',
      });

      models.User.findByPk.mockResolvedValue(user);

      const tokenRow = {
        id: 'old-jti',
        userId: 2,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        rotatedAt: null,
        replacedByTokenId: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      models.RefreshToken.findOne.mockResolvedValue(tokenRow);

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const oldRefresh = makeRefreshToken({
        sub: 2,
        jti: 'old-jti',
      });

      const response = await request(app).post('/api/session/refresh').set(
        'user-agent',
        'RefreshUA'
      ).set(
        'Cookie',
        `rt=${oldRefresh}`
      ).expect(200);

      expect(mocks.sequelize.transaction).toHaveBeenCalledTimes(1);

      expect(models.RefreshToken.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: 'old-jti',
          userId: 2,
        },
        transaction: mocks.sequelize.__transaction,
        lock: 'UPDATE',
      }));

      expect(mocks.tokens.mintTokenPair).toHaveBeenCalledWith(user, expect.objectContaining({
        ua: 'RefreshUA',
        ip: expect.any(String),
        transaction: mocks.sequelize.__transaction,
      }));

      expect(tokenRow.rotatedAt).toBeInstanceOf(Date);

      expect(tokenRow.replacedByTokenId).toBe('new-jti-123');

      expect(tokenRow.save).toHaveBeenCalledTimes(1);

      expect(tokenRow.save).toHaveBeenCalledWith({ transaction: mocks.sequelize.__transaction });

      expect(mocks.tokens.setRefreshCookie).toHaveBeenCalled();

      expect(response.body).toEqual({
        data: {
          accessToken: 'access-token',
          expiresIn: ACCESS_TTL_SEC,
        },
      });
    });

    test('returns 401 when refresh cookie is missing', async () => {
      const {
        app,
        mocks,
      } = await loadApp();

      await request(app).post('/api/session/refresh').expect(401);

      expect(mocks.tokens.clearRefreshCookie).not.toHaveBeenCalled();

      expect(mocks.sequelize.transaction).not.toHaveBeenCalled();
    });

    test('rejects an invalid refresh token and clears the cookie', async () => {
      const {
        app,
        mocks,
      } = await loadApp();

      await request(app).post('/api/session/refresh').set('Cookie', 'rt=NOT_A_TOKEN').expect(401);

      expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalledTimes(1);
    });

    test('rejects refresh token claims without jti', async () => {
      const {
        app,
        mocks,
      } = await loadApp();

      const token = makeRefreshToken({
        sub: 1,
        jti: undefined,
      });

      await request(app).post('/api/session/refresh').set('Cookie', `rt=${token}`).expect(401);

      expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalledTimes(1);

      expect(mocks.sequelize.transaction).not.toHaveBeenCalled();
    });

    test.each([
      ['missing', () => null, 'token_not_found'],
      [
        'revoked',
        () =>
        ({
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: new Date(),
          rotatedAt: null,
        }),
        'token_revoked',
      ],
      [
        'rotated',
        () =>
        ({
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null,
          rotatedAt: new Date(),
        }),
        'token_rotated',
      ],
      [
        'expired',
        () =>
        ({
          expiresAt: new Date(Date.now() - 1000),
          revokedAt: null,
          rotatedAt: null,
        }),
        'token_expired',
      ],
    ])('rejects a %s stored refresh token', async (_label, makeRow, reason) => {
      const models = makeModelsMock();

      models.User.findByPk.mockResolvedValue(makeMockUser({ id: 3 }));

      models.RefreshToken.findOne.mockResolvedValue(makeRow());

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const token = makeRefreshToken({
        sub: 3,
        jti: 'old-jti',
      });

      await request(app).post('/api/session/refresh').set('Cookie', `rt=${token}`).expect(401);

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        event: 'refresh_failed',
        userId: 3,
        reason,
      }));

      expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalled();
    });

    test('rejects refresh for a restricted user before opening a transaction', async () => {
      const models = makeModelsMock();

      models.User.findByPk.mockResolvedValue(makeMockUser({
        id: 4,
        isRestricted: true,
      }));

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const token = makeRefreshToken({
        sub: 4,
        jti: 'jti-4',
      });

      await request(app).post('/api/session/refresh').set('Cookie', `rt=${token}`).expect(401);

      expect(mocks.sequelize.transaction).not.toHaveBeenCalled();

      expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalled();

      expect(mocks.audit.auditAuthEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        event: 'refresh_failed',
        userId: 4,
        reason: 'user_restricted',
      }));
    });
  });

  describe('POST /sign-out', () => {
    test('clears the cookie and revokes the refresh token even if the JWT is expired', async () => {
      const models = makeModelsMock();

      const tokenRow = {
        id: 'jti-zzz',
        revokedAt: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      models.RefreshToken.findOne.mockResolvedValue(tokenRow);

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const expired = makeRefreshToken({
        sub: 9,
        jti: 'jti-zzz',
        expSec: Math.floor(Date.now() / 1000) - 60,
      });

      const response = await request(app).post('/api/session/sign-out').set(
        'Cookie',
        `rt=${expired}`
      ).expect(200);

      expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalled();

      expect(models.RefreshToken.findOne).toHaveBeenCalledWith({ where: { id: 'jti-zzz' } });

      expect(tokenRow.revokedAt).toBeInstanceOf(Date);

      expect(tokenRow.save).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({ data: null });
    });

    test('invalid refresh token does not prevent sign-out', async () => {
      const models = makeModelsMock();

      const {
        app,
        mocks,
      } = await loadApp({ models });

      await request(app).post('/api/session/sign-out').set('Cookie', 'rt=BAD_TOKEN').expect(200);

      expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalled();

      expect(models.RefreshToken.findOne).not.toHaveBeenCalled();
    });
  });

  describe('GET /me', () => {
    test('returns the authenticated user', async () => {
      const models = makeModelsMock();

      models.User.findByPk.mockResolvedValue({
        id: 5,
        userName: 'ME',
        firstName: 'First',
        lastName: 'Last',
        roleId: 1,
        role: {
          id: 1,
          name: 'ADMIN',
        },
      });

      const {
        app,
        mocks,
      } = await loadApp({ models });

      const response = await request(app).get('/api/session/me').set('x-test-user-id', '5').expect(200);

      expect(mocks.requireAuth).toHaveBeenCalled();

      expect(models.User.findByPk).toHaveBeenCalledWith(5, expect.any(Object));

      expect(response.body).toEqual({
        data: {
          id: 5,
          userName: 'ME',
          firstName: 'First',
          lastName: 'Last',
          roleName: 'ADMIN',
          roleId: 1,
        },
      });
    });

    test('returns 401 when authenticated user no longer exists', async () => {
      const models = makeModelsMock();

      models.User.findByPk.mockResolvedValue(null);

      const { app } = await loadApp({ models });

      await request(app).get('/api/session/me').set('x-test-user-id', '404').expect(401);
    });
  });
});
