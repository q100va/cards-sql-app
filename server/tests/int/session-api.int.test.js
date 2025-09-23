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

// Константы теста
const ACCESS_SECRET = 'acc-secret';
const REFRESH_SECRET = 'ref-secret';
const ACCESS_TTL_SEC = 900;

// ——— фабрики моков ———
function makeRateLimiterMock() {
  const ok = { consume: jest.fn(async () => ({ remainingPoints: 1, msBeforeNext: 0 })), delete: jest.fn(async () => true) };
  return {
    signInIpLimiter: ok,
    signInUserLimiter: ok,
    signInUaLimiter: ok,
    signInGlobalLimiter: ok,
    resetKey: jest.fn(async () => { }),
    loginKey: (s) => String(s ?? '').trim().toLowerCase(),
  };
}
function makeModelsMock() {
  const User = { findOne: jest.fn(), findByPk: jest.fn() };
  const Role = {};
  const RefreshToken = { findOne: jest.fn(), create: jest.fn(async (args) => args) };
  return { User, Role, RefreshToken };
}
function makeTokensMock() {
  const setRefreshCookie = jest.fn((res, token) => res.cookie('rt', token, { httpOnly: true, path: '/api/session' }));
  const clearRefreshCookie = jest.fn((res) => res.clearCookie('rt', { path: '/api/session' }));
  const mintTokenPair = jest.fn(async (user) => {
    const accessToken = jwt.sign(
      { sub: String(user.id), uname: user.userName, role: user.role?.name ?? 'USER', roleId: user.roleId ?? 999 },
      ACCESS_SECRET, { issuer: 'cards-sql-app', audience: 'web', expiresIn: ACCESS_TTL_SEC }
    );
    const refreshToken = jwt.sign(
      { sub: String(user.id), jti: 'new-jti-123' },
      REFRESH_SECRET, { issuer: 'cards-sql-app', audience: 'web', expiresIn: 3600 }
    );
    return { accessToken, refreshToken };
  });
  return { ACCESS_TTL_SEC, REFRESH_SECRET, mintTokenPair, setRefreshCookie, clearRefreshCookie };
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
function makeStatefulUser(username = 'bob', failedLoginCount = 0) {
  // простая in-memory модель пользователя c методами, как в модели
  return {
    id: 1,
    userName: username,
    firstName: 'B',
    lastName: 'O',
    patronymic: null,
    comment: null,
    password: 'HASH',
    role: { name: 'USER' },
    isRestricted: false,
    failedLoginCount: failedLoginCount,
    lockedUntil: null,
    bruteWindowStart: null,
    bruteStrikeCount: 0,
    causeOfRestriction: null,
    dateOfRestriction: null,
    async save() { /* nop: состояние уже в объекте */ },
    async registerFailedLogin(now = new Date()) {
      // FAILS_TO_LOCK=7, LOCK=15m, WINDOW=24h, STRIKES=3 (как в роуте)
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
        if (!winStart || (now.getTime() - winStart.getTime()) > WINDOW_MS) {
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
      }
      return { events, state: this };
    },
    async resetAfterSuccess() {
      if (this.failedLoginCount || this.lockedUntil) {
        this.failedLoginCount = 0;
        this.lockedUntil = null;
      }
      return { touched: true };
    },
  };
}
// упрощаем validateRequest
const validateRequestMock = { validateRequest: () => (_req, _res, next) => next() };
// схема не важна для интеграционного сценария
const signInSchemaMock = { signInReqSchema: {} };
// verify пароля — будем менять в тестах по месту
const passwordsMock = { verify: jest.fn(async () => true), DUMMY_ARGON2_HASH: '$argon2id$dummy' };
// аудит
const auditAuthMock = { auditAuthFail: jest.fn(async () => { }) };

// requireAccess: декодируем Bearer, кладём req.user (приближение к реальному)
function makeRequireAccessMock() {
  return {
    requireAccess: (req, res, next) => {
      try {
        const auth = req.headers?.authorization || '';
        const [, token] = auth.split(' ');
        if (!token) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
        const payload = jwt.verify(token, ACCESS_SECRET, { issuer: 'cards-sql-app', audience: 'web' });
        req.user = { id: Number(payload.sub), userName: payload.uname, roleName: payload.role ?? null };
        next();
      } catch {
        return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
      }
    }
  };
}

// ——— загрузка приложения с моками ———
async function loadApp({
  rateLimiter = makeRateLimiterMock(),
  models = makeModelsMock(),
  tokens = makeTokensMock(),
  passwords = passwordsMock,
  requireAccess = makeRequireAccessMock(),
} = {}) {
  await jest.isolateModulesAsync(async () => {
    process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;

    jest.unstable_mockModule('../../middlewares/validate-request.js', () => validateRequestMock);
    jest.unstable_mockModule('../../../shared/dist/auth.schema.js', () => signInSchemaMock);
    jest.unstable_mockModule('../../logging/audit-auth.js', () => auditAuthMock);
    jest.unstable_mockModule('../../controllers/passwords.mjs', () => passwords);
    jest.unstable_mockModule('../../controllers/rate-limit.js', () => rateLimiter);
    jest.unstable_mockModule('../../controllers/token.js', () => tokens);
    jest.unstable_mockModule('../../middlewares/require-access.js', () => requireAccess);
    jest.unstable_mockModule('../../models/index.js', () => models);

    const { default: router } = await import(routerPath);
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/session', router);
    Object.assign(loadApp, { app, mocks: { rateLimiter, models, tokens, passwords } });
  });
  return { app: loadApp.app, mocks: loadApp.mocks };
}

// ——— helpers токенов для теста ———
function makeAccess(user = { id: 1, userName: 'u', role: { name: 'USER' }, roleId: 999  }) {
  return jwt.sign(
    { sub: String(user.id), uname: user.userName, role: user.role?.name ?? 'USER', roleId: user.roleId ?? 999  },
    ACCESS_SECRET, { issuer: 'cards-sql-app', audience: 'web', expiresIn: 3600 }
  );
}
function makeRefresh({ sub = 1, jti = 'jti-1', expSec = Math.floor(Date.now() / 1000) + 3600 } = {}) {
  return jwt.sign({ sub: String(sub), jti, exp: expSec, aud: 'web', iss: 'cards-sql-app' }, REFRESH_SECRET);
}

// ——— ТЕСТЫ ———
describe('integration: /api/session', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('POST /sign-in → 200, user + token + refresh-cookie, resetKey вызван', async () => {
    const models = makeModelsMock();
    const userRow = makeMockUser({
      id: 10, userName: 'Alice', firstName: 'A', lastName: 'L',
      role: { name: 'ADMIN' },
      roleId: 1,
      failedLoginCount: 2,
    });
    models.User.findOne.mockResolvedValue(userRow);

    const { app, mocks } = await loadApp({ models });
    const res = await request(app).post('/api/session/sign-in').send({ userName: 'Alice', password: 'p@ss12345' }).expect(200);

    expect(res.body.data.user).toMatchObject({
      id: 10,
      userName: 'Alice',
      firstName: 'A',
      lastName: 'L',
      roleId: 1
    });
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.expiresIn).toBe(ACCESS_TTL_SEC);
    expect((res.headers['set-cookie'] ?? []).join(';')).toMatch(/rt=/);
    expect(mocks.rateLimiter.resetKey).toHaveBeenCalled();
  });

  test('POST /sign-in → 429 user-rate-limit; БД не трогаем (User.findOne не вызывался)', async () => {
    const rateLimiter = makeRateLimiterMock();
    rateLimiter.signInUserLimiter.consume.mockRejectedValue({ msBeforeNext: 7000 });

    const models = makeModelsMock();
    const { app } = await loadApp({ rateLimiter, models });

    const res = await request(app).post('/api/session/sign-in').send({ userName: 'xx', password: 'yy' }).expect(429);

    expect(res.headers['retry-after']).toBe('7');
    expect(models.User.findOne).not.toHaveBeenCalled();
  });

  test('POST /refresh → 200, старая запись помечена rotated, связана с новой (replacedByTokenId), выдан новый cookie', async () => {
    const models = makeModelsMock();
    models.User.findByPk.mockResolvedValue({ id: 2, userName: 'refUser', firstName: 'R', lastName: 'U', role: { name: 'USER' } });
    const tokenRow = {
      id: 'old-jti-1', userId: 2, expiresAt: new Date(Date.now() + 10_000),
      revokedAt: null, rotatedAt: null, replacedByTokenId: null, save: jest.fn(async () => { }),
    };
    models.RefreshToken.findOne.mockResolvedValue(tokenRow);

    const { app, mocks } = await loadApp({ models });

    const oldRefresh = makeRefresh({ sub: 2, jti: 'old-jti-1' });
    const res = await request(app).post('/api/session/refresh').set('Cookie', [`rt=${oldRefresh}`]).expect(200);

    expect(typeof res.body.data.accessToken).toBe('string');
    expect(tokenRow.rotatedAt).toBeInstanceOf(Date);
    expect(tokenRow.save).toHaveBeenCalledTimes(2);
    expect(mocks.tokens.setRefreshCookie).toHaveBeenCalled();
    expect(tokenRow.replacedByTokenId).toBe('new-jti-123');
  });

  test('POST /sign-out → 200, cookie очищена, refresh ревокнут', async () => {
    const models = makeModelsMock();
    const row = { id: 'jti-zzz', revokedAt: null, save: jest.fn(async () => { }) };
    models.RefreshToken.findOne.mockResolvedValue(row);

    const { app, mocks } = await loadApp({ models });

    const rt = makeRefresh({ sub: 9, jti: 'jti-zzz' });
    const res = await request(app).post('/api/session/sign-out').set('Cookie', [`rt=${rt}`]).expect(200);

    expect((res.headers['set-cookie'] ?? []).join(';')).toMatch(/rt=;/);
    expect(row.revokedAt).toBeInstanceOf(Date);
    expect(row.save).toHaveBeenCalled();
    expect(mocks.tokens.clearRefreshCookie).toHaveBeenCalled();
  });

  test('GET /me → 200', async () => {
    const models = makeModelsMock();
    models.User.findByPk.mockResolvedValue({ id: 5, userName: 'ME', firstName: 'First', lastName: 'Last', role: { name: 'ADMIN' }, roleId: 1  });
    const { app } = await loadApp({ models });

    const access = makeAccess({ id: 5, userName: 'ME', role: { name: 'ADMIN' }, roleId: 1  });
    const res = await request(app).get('/api/session/me').set('Authorization', `Bearer ${access}`).expect(200);

    expect(res.body.data).toEqual({ id: 5, userName: 'ME', firstName: 'First', lastName: 'Last', roleName: 'ADMIN', roleId: 1 });
  });

  test('GET /me → 401, если пользователя нет', async () => {
    const models = makeModelsMock();
    models.User.findByPk.mockResolvedValue(null);
    const { app } = await loadApp({ models });

    const access = makeAccess({ id: 404, userName: 'nope' });
    await request(app).get('/api/session/me').set('Authorization', `Bearer ${access}`).expect(401);
  });

  test('POST /sign-in — после 7-й неверной попытки следующий запрос возвращает 423 ACCOUNT_LOCKED', async () => {
    const models = makeModelsMock();
    const u = makeStatefulUser('lockee');
    // findOne всегда возвращает того же юзера (одна и та же ссылка — важно)
    models.User.findOne.mockImplementation(async () => u);

    // пароли всегда неверны
    const passwords = { ...passwordsMock, verify: jest.fn(async () => false) };

    const { app } = await loadApp({ models, passwords });

    // 7 попыток → каждая 401
    for (let i = 0; i < 7; i++) {
      const r = await request(app).post('/api/session/sign-in').send({ userName: 'lockee', password: 'bad' });
      expect([200, 401]).toContain(r.status); // должно быть 401; допускаем проверку статуса ниже
      expect(r.status).toBe(401);
    }

    // 8-я попытка — аккаунт уже залочен → 423
    const res = await request(app).post('/api/session/sign-in').send({ userName: 'lockee', password: 'bad' });
    expect(res.status).toBe(423);
    expect(res.body.code).toBe('ERRORS.ACCOUNT_LOCKED');
  });

  test('POST /sign-in — три лока за 24ч → следующий запрос 423 ACCOUNT_RESTRICTED', async () => {
    const models = makeModelsMock();
    const u = makeStatefulUser('restrict');
    models.User.findOne.mockImplementation(async () => u);

    const passwords = { ...passwordsMock, verify: jest.fn(async () => false) };
    const { app } = await loadApp({ models, passwords });

    // Лок #1: 7 неудач → лок, сразу ещё один запрос → 423 LOCKED
    for (let i = 0; i < 7; i++) await request(app).post('/api/session/sign-in').send({ userName: 'restrict', password: 'bad' }).expect(401);
    await request(app).post('/api/session/sign-in').send({ userName: 'restrict', password: 'bad' }).expect(423);

    // Снимем лок вручную (эмулируем «прошло 15 минут»)
    u.lockedUntil = null;

    // Лок #2
    for (let i = 0; i < 7; i++) await request(app).post('/api/session/sign-in').send({ userName: 'restrict', password: 'bad' }).expect(401);
    await request(app).post('/api/session/sign-in').send({ userName: 'restrict', password: 'bad' }).expect(423);

    // Снимем лок снова
    u.lockedUntil = null;

    // Лок #3 → в registerFailedLogin станет isRestricted=true.
    for (let i = 0; i < 7; i++) await request(app).post('/api/session/sign-in').send({ userName: 'restrict', password: 'bad' }).expect(401);

    // Теперь следующий запрос пойдёт по ветке isRestricted → 423 ACCOUNT_RESTRICTED
    const res = await request(app).post('/api/session/sign-in').send({ userName: 'restrict', password: 'bad' });
    expect(res.status).toBe(423);
    expect(res.body.code).toBe('ERRORS.ACCOUNT_RESTRICTED');
  });
});
