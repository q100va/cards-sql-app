/* @jest-environment node */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routerPath = path.resolve(__dirname, '../../routes/session-api.js');

// ---------- тестовые константы ----------
const ACCESS_SECRET = 'acc-secret';
const REFRESH_SECRET = 'ref-secret';
const ACCESS_TTL_SEC = 900;

// ---------- моки модулей ----------
function makeRateLimiterMock() {
  // по умолчанию — пропускаем
  const ok = { consume: jest.fn(async () => ({ remainingPoints: 1, msBeforeNext: 0 })), delete: jest.fn(async () => true) };
  return {
    signInIpLimiter: ok,
    signInUserLimiter: ok,
    signInUaLimiter: ok,
    signInGlobalLimiter: ok,
    resetKey: jest.fn(async () => true),
    loginKey: (s) => String(s ?? '').trim().toLowerCase(),
    __all: ok,
  };
}
function makeModelsMock() {
  // Заглушки — наполним в самих тестах
  const User = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  };
  const Role = {}; // не используется напрямую
  const RefreshToken = {
    findOne: jest.fn(),
    create: jest.fn(), // обычно дергается через mintTokenPair, но оставим
  };
  return { User, Role, RefreshToken };
}

function makeMockUser(initial = {}) {
  const u = {
    id: 1,
    userName: 'user',
    firstName: 'F',
    lastName: 'L',
    password: 'HASH',
    role: { name: 'USER' },
    isRestricted: false,
    failedLoginCount: 0,
    lockedUntil: null,
    bruteWindowStart: null,
    bruteStrikeCount: 0,
    save: jest.fn(async () => { }),
    async resetAfterSuccess() {
      if (this.failedLoginCount || this.lockedUntil) {
        this.failedLoginCount = 0;
        this.lockedUntil = null;
        await this.save();
        return { touched: true };
      }
      return { touched: false };
    },
    async registerFailedLogin(now = new Date()) {
      const LOCK_MS = 15 * 60_000;
      const WINDOW_MS = 24 * 60 * 60_000;
      const STRIKES = 3;
      const events = [];

      this.failedLoginCount = (this.failedLoginCount ?? 0) + 1;

      if (this.failedLoginCount >= 7) {
        this.failedLoginCount = 0;
        this.lockedUntil = new Date(now.getTime() + LOCK_MS);
        events.push('locked');

        const winStart = this.bruteWindowStart ? new Date(this.bruteWindowStart) : null;
        if (!winStart || (now - winStart) > WINDOW_MS) {
          this.bruteWindowStart = now;
          this.bruteStrikeCount = 1;
        } else {
          this.bruteStrikeCount = (this.bruteStrikeCount ?? 0) + 1;
        }

        if ((this.bruteStrikeCount ?? 0) >= STRIKES) {
          this.isRestricted = true;
          this.causeOfRestriction = 'daily_lockout';
          this.dateOfRestriction = now;
          events.push('restricted');
        }
        await this.save();
      } else {
        await this.save();
      }

      return { events, state: this };
    },
    ...initial,
  };
  return u;
}

function makeTokensMock() {
  const setRefreshCookie = jest.fn((res, token) => {
    // имитируем запись cookie rt (для удобства в supertest)
    res.cookie('rt', token, { httpOnly: true, path: '/api/session' });
  });
  const clearRefreshCookie = jest.fn((res) => {
    res.clearCookie('rt', { path: '/api/session' });
  });

  // mintTokenPair вернёт фиксированные токены
  const mintTokenPair = jest.fn(async (_user, _ctx) => {
    // access
    const accessToken = jwt.sign(
      { sub: String(_user.id), uname: _user.userName, role: _user.role?.name ?? 'USER' },
      ACCESS_SECRET,
      { issuer: 'cards-sql-app', audience: 'web', expiresIn: ACCESS_TTL_SEC }
    );
    // refresh (важно: jti, чтобы /refresh мог связать)
    const refreshToken = jwt.sign(
      { sub: String(_user.id), jti: 'new-jti-123' },
      REFRESH_SECRET,
      { issuer: 'cards-sql-app', audience: 'web', expiresIn: 3600 }
    );
    return { accessToken, refreshToken };
  });

  return {
    ACCESS_TTL_SEC,
    REFRESH_SECRET, // используется в роутере при verify(refresh)
    mintTokenPair,
    setRefreshCookie,
    clearRefreshCookie,
  };
}

// validateRequest → pass-through
const validateRequestMock = {
  validateRequest: () => (req, _res, next) => next(),
};

// signInReqSchema заглушка
const signInSchemaMock = { signInReqSchema: {} };

// verify(password) мок (переключаем внутри тестов)
const passwordsMock = {
  verify: jest.fn(async () => true),
  DUMMY_ARGON2_HASH: '$argon2id$dummy',
};

// аудит провалов логина
const auditAuthMock = { auditAuthFail: jest.fn(async () => { }) };


// ---------- загрузчик приложения с моками ----------
async function loadApp({
  rateLimiter = makeRateLimiterMock(),
  models = makeModelsMock(),
  tokens = makeTokensMock(),
  passwords = passwordsMock,
} = {}) {
  await jest.isolateModulesAsync(async () => {
    // env
    process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;

    // моки модулей
    jest.unstable_mockModule('../../middlewares/validate-request.js', () => validateRequestMock);
    jest.unstable_mockModule('../../../shared/dist/auth.schema.js', () => signInSchemaMock);
    jest.unstable_mockModule('../../logging/audit-auth.js', () => auditAuthMock);
    jest.unstable_mockModule('../../controllers/passwords.mjs', () => passwords);
    jest.unstable_mockModule('../../controllers/rate-limit.js', () => rateLimiter);
    jest.unstable_mockModule('../../controllers/token.js', () => tokens);
    jest.unstable_mockModule('../../models/index.js', () => models);
    jest.unstable_mockModule('../../middlewares/require-access.js', () => ({
      requireAccess: (req, res, next) => {
        try {
          const auth = req.headers?.authorization || '';
          const [, token] = auth.split(' ');
          if (!token) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });

          const payload = jwt.verify(token, ACCESS_SECRET, {
            issuer: 'cards-sql-app',
            audience: 'web',
          });

          req.user = {
            id: Number(payload.sub),
            userName: payload.uname,
            roleName: payload.role ?? null, // не обязательно для /me, но ближе к бою
          };
          next();
        } catch {
          return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
        }
      },
    }));

    // импортируем роутер
    const { default: router } = await import(routerPath);

    // поднимем минимальный express-приложение
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/session', router);

    Object.assign(loadApp, { app, mocks: { rateLimiter, models, tokens, passwords, auditAuthMock } });
  });

  return { app: loadApp.app, mocks: loadApp.mocks };
}

// ---------- утилиты ----------
function makeAccess(user = { id: 1, userName: 'u', role: { name: 'USER' }, roleId: 999 }) {
  return jwt.sign(
    { sub: String(user.id), uname: user.userName, role: user.role?.name ?? 'USER', roleId: user.roleId ?? 999 },
    ACCESS_SECRET,
    { issuer: 'cards-sql-app', audience: 'web', expiresIn: 3600 }
  );
}
function makeRefresh({ sub = 1, jti = 'jti-1', expSec = Math.floor(Date.now() / 1000) + 3600 } = {}) {
  return jwt.sign(
    { sub: String(sub), jti, exp: expSec, aud: 'web', iss: 'cards-sql-app' },
    REFRESH_SECRET
  );
}

// =======================================================
//                         TESTS
// =======================================================
describe('routes: /api/session', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // ---------- /sign-in ----------
  test('POST /sign-in — success (returns user, token, sets refresh cookie, resets limiter)', async () => {
    const models = makeModelsMock();
    // пользователь найден
    const userRow = makeMockUser({
      id: 10, userName: 'Alice', firstName: 'A', lastName: 'L',
      role: { name: 'ADMIN' },
      failedLoginCount: 2,
    });
    models.User.findOne.mockResolvedValue(userRow);

    const { app, mocks } = await loadApp({ models });

    // verify → true по умолчанию, лимитеры пропускают
    const res = await request(app)
      .post('/api/session/sign-in')
      .send({ userName: 'Alice', password: 'p@ss12345' })
      .expect(200);

    expect(res.body.data.user).toMatchObject({
      id: 10, userName: 'Alice', firstName: 'A', lastName: 'L', roleName: 'ADMIN',
    });
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.expiresIn).toBe(ACCESS_TTL_SEC);
    // refresh cookie выставлен
    const setCookie = res.headers['set-cookie']?.join(';') ?? '';
    expect(setCookie).toMatch(/rt=/);
    // resetKey по userKey дернули
    expect(mocks.rateLimiter.resetKey).toHaveBeenCalled();
  });

  test('POST /sign-in — bad password → increments counter, possibly locks, returns 401', async () => {
    const models = makeModelsMock();
    const userRow = makeMockUser({
      id: 10, userName: 'Alice', firstName: 'A', lastName: 'L',
      role: { name: 'ADMIN' },
      failedLoginCount: 2,
    });
    models.User.findOne.mockResolvedValue(userRow);

    const passwords = { ...passwordsMock, verify: jest.fn(async () => false) };

    const { app } = await loadApp({ models, passwords });

    const res = await request(app)
      .post('/api/session/sign-in')
      .send({ userName: 'bob', password: 'wrong' })
      .expect(401);

    expect(res.body).toEqual({ code: 'ERRORS.INVALID_AUTHORIZATION', data: null });
    // Счётчик должен был сброситься и поставиться блокировка
    expect(userRow.save).toHaveBeenCalled();
    // либо в этом заходе >=7 и он локнулся, либо просто инкрементился — в любом случае save был
  });

  test('POST /sign-in — user-level rate limit → 429 + Retry-After', async () => {
    const rateLimiter = makeRateLimiterMock();
    // первый лимитер — user — кидает
    rateLimiter.signInUserLimiter.consume.mockRejectedValue({ msBeforeNext: 5000 });

    const { app } = await loadApp({ rateLimiter });

    const res = await request(app)
      .post('/api/session/sign-in')
      .send({ userName: 'xx', password: 'yy' })
      .expect(429);

    expect(res.body.code).toBe('ERRORS.TOO_MANY_ATTEMPTS');
    expect(res.headers['retry-after']).toBe('5');
  });

  // ---------- /refresh ----------
  test('POST /refresh — success (rotates, links tokens, sets new cookie)', async () => {
    const models = makeModelsMock();
    models.User.findByPk.mockResolvedValue({
      id: 2, userName: 'refUser', firstName: 'R', lastName: 'U', role: { name: 'USER' },
    });
    // Найден старый refresh, не истёк, не ротирован/не ревокнут
    const tokenRow = {
      id: 'old-jti-1', userId: 2, expiresAt: new Date(Date.now() + 10_000),
      revokedAt: null, rotatedAt: null, replacedByTokenId: null,
      save: jest.fn(async () => { }),
    };
    models.RefreshToken.findOne.mockResolvedValue(tokenRow);

    const { app, mocks } = await loadApp({ models });

    const oldRefresh = makeRefresh({ sub: 2, jti: 'old-jti-1' });
    const res = await request(app)
      .post('/api/session/refresh')
      .set('Cookie', [`rt=${oldRefresh}`])
      .expect(200);

    // вернулся новый access
    expect(typeof res.body.data.accessToken).toBe('string');
    // старый refresh помечен как rotated и связан с новым
    expect(tokenRow.rotatedAt).toBeInstanceOf(Date);
    expect(tokenRow.save).toHaveBeenCalledTimes(2);
    // setRefreshCookie был вызван с новым refresh
    expect(mocks.tokens.setRefreshCookie).toHaveBeenCalled();

    // проверим replacedByTokenId (mintTokenPair из мока шьёт jti: 'new-jti-123')
    expect(tokenRow.replacedByTokenId).toBe('new-jti-123');
  });

  test('POST /refresh — 401 when missing cookie / invalid / expired / revoked', async () => {
    const { app } = await loadApp();

    // нет cookie
    await request(app).post('/api/session/refresh').expect(401);

    // кривой токен
    await request(app)
      .post('/api/session/refresh')
      .set('Cookie', ['rt=NOT_A_TOKEN'])
      .expect(401);

    // истёкший токен или revoked/rotated
    {
      const models = makeModelsMock();
      models.User.findByPk.mockResolvedValue({ id: 3, userName: 'x', firstName: 'x', lastName: 'y', role: { name: 'USER' } });
      models.RefreshToken.findOne.mockResolvedValue({
        id: 'jti-x', userId: 3,
        expiresAt: new Date(Date.now() - 1000), // истёк
        revokedAt: null, rotatedAt: null,
      });
      const { app: app2 } = await loadApp({ models });

      const expiredRt = makeRefresh({ sub: 3, jti: 'jti-x', expSec: Math.floor(Date.now() / 1000) - 100 });
      await request(app2)
        .post('/api/session/refresh')
        .set('Cookie', [`rt=${expiredRt}`])
        .expect(401);
    }
  });

  // ---------- /sign-out ----------
  test('POST /sign-out — clears cookie and revokes existing refresh', async () => {
    const models = makeModelsMock();
    const row = { id: 'jti-zzz', revokedAt: null, save: jest.fn(async () => { }) };
    models.RefreshToken.findOne.mockResolvedValue(row);

    const { app, mocks } = await loadApp({ models });

    const rt = makeRefresh({ sub: 9, jti: 'jti-zzz' });
    const res = await request(app)
      .post('/api/session/sign-out')
      .set('Cookie', [`rt=${rt}`])
      .expect(200);

    // cookie очищена
    const setCookie = res.headers['set-cookie']?.join(';') ?? '';
    expect(setCookie).toMatch(/rt=;/); // rt стёрта
    // ревокнули
    expect(row.revokedAt).toBeInstanceOf(Date);
    expect(row.save).toHaveBeenCalled();
    // clearRefreshCookie вызывался
    expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalled();
  });

  // ---------- /me ----------
  test('GET /me — success', async () => {
    const models = makeModelsMock();
    models.User.findByPk.mockResolvedValue({
      id: 5, userName: 'ME', firstName: 'First', lastName: 'Last', role: { name: 'ADMIN' }, roleId: 1
    });
    const { app } = await loadApp({ models });

    // Проставим реальный Bearer access, а requireAccessMock пропустит
    const access = makeAccess({ id: 5, userName: 'ME', role: { name: 'ADMIN' }, roleId: 1 });
    const res = await request(app)
      .get('/api/session/me')
      .set('Authorization', `Bearer ${access}`)
      .expect(200);

    expect(res.body.data).toEqual({
      id: 5, userName: 'ME', firstName: 'First', lastName: 'Last', roleName: 'ADMIN', roleId: 1
    });
  });

  test('GET /me — 401 when user not found', async () => {
    const models = makeModelsMock();
    models.User.findByPk.mockResolvedValue(null);
    const { app } = await loadApp({ models });

    const access = makeAccess({ id: 404, userName: 'nope' });
    await request(app)
      .get('/api/session/me')
      .set('Authorization', `Bearer ${access}`)
      .expect(401);
  });

});
