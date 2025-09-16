/* @jest-environment node */
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// поправь путь к модулю, если отличается
const mwPath = path.resolve(__dirname, '../../middlewares/check-auth.js');

// ——— helpers ———
async function loadMiddlewares(secret = 'access-secret') {
  await jest.isolateModulesAsync(async () => {
    process.env.JWT_ACCESS_SECRET = secret;
    const mod = await import(mwPath);
    Object.assign(loadMiddlewares, { mod });
  });
  return loadMiddlewares.mod; // { requireAuth, optionalAuth, default }
}

function makeToken(opts = {}, secret = 'access-secret') {
  const {
    userId = 42,
    userName = 'alice',
    // роль без дефолта, чтобы можно было протестить отсутствие клейма
    role,
    exp = undefined, // unix seconds; если задан, используем вместо expiresIn
    issuer = 'cards-sql-app',
    audience = 'web',
  } = opts;

  const payload = { sub: String(userId), uname: userName };
  if (role !== undefined) payload.role = role;

  const signOpts = { issuer, audience, expiresIn: '1h' };
  if (typeof exp === 'number') {
    delete signOpts.expiresIn;
    payload.exp = exp;
  }
  return jwt.sign(payload, secret, signOpts);
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json:   jest.fn(function (obj)  { this.body = obj; return this; }),
    setHeader: jest.fn(function (k, v) { this.headers[k] = v; }),
  };
}

// ——— tests ———
describe('middlewares: requireAuth & optionalAuth', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // requireAuth

  test('requireAuth: passes OPTIONS without auth', async () => {
    const { requireAuth } = await loadMiddlewares('s3cr3t');
    const req = { method: 'OPTIONS', headers: {} };
    const res = createRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('requireAuth: 401 when Authorization header missing/invalid', async () => {
    const { requireAuth } = await loadMiddlewares('s3cr3t');
    const cases = [
      { headers: {} },
      { headers: { authorization: '' } },
      { headers: { authorization: 'Bearer' } },
      { headers: { authorization: 'Token abc' } }, // wrong scheme
    ];

    for (const req of cases) {
      const res = createRes();
      const next = jest.fn();
      await requireAuth({ method: 'GET', ...req }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
    }
  });

  test('requireAuth: sets req.user on valid token (role present)', async () => {
    const secret = 'acc';
    const { requireAuth } = await loadMiddlewares(secret);

    const token = makeToken({ userId: 101, userName: 'Bob', role: 'ADMIN' }, secret);
    const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
    const res = createRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id: 101, userName: 'Bob', role: 'ADMIN' });
  });

  test('requireAuth: sets role null when role claim is absent', async () => {
    const secret = 'acc';
    const { requireAuth } = await loadMiddlewares(secret);

    // роль не задаём → клейма role нет
    const token = makeToken({ userId: 7, userName: 'no-role' }, secret);
    const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
    const res = createRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 7, userName: 'no-role', role: null });
  });

  test('requireAuth: 401 on wrong signature / issuer / audience / expired', async () => {
    // wrong signature
    {
      const { requireAuth } = await loadMiddlewares('right');
      const bad = makeToken({}, 'wrong');
      const req = { method: 'GET', headers: { authorization: `Bearer ${bad}` } };
      const res = createRes();
      const next = jest.fn();
      await requireAuth(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    }
    // wrong issuer
    {
      const { requireAuth } = await loadMiddlewares('right');
      const bad = makeToken({ issuer: 'not-our-app' }, 'right');
      const req = { method: 'GET', headers: { authorization: `Bearer ${bad}` } };
      const res = createRes();
      const next = jest.fn();
      await requireAuth(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    }
    // wrong audience
    {
      const { requireAuth } = await loadMiddlewares('right');
      const bad = makeToken({ audience: 'mobile' }, 'right');
      const req = { method: 'GET', headers: { authorization: `Bearer ${bad}` } };
      const res = createRes();
      const next = jest.fn();
      await requireAuth(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    }
    // expired
    {
      const { requireAuth } = await loadMiddlewares('right');
      const past = Math.floor(Date.now() / 1000) - 10;
      const expired = makeToken({ exp: past }, 'right');
      const req = { method: 'GET', headers: { authorization: `Bearer ${expired}` } };
      const res = createRes();
      const next = jest.fn();
      await requireAuth(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    }
  });

  // optionalAuth

  test('optionalAuth: sets req.user if valid token; always calls next', async () => {
    const secret = 'acc';
    const { optionalAuth } = await loadMiddlewares(secret);

    const token = makeToken({ userId: 501, userName: 'Zoe', role: 'USER' }, secret);
    const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
    const res = createRes();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 501, userName: 'Zoe', role: 'USER' });
  });

  test('optionalAuth: no token or bad token -> no req.user, but next() called', async () => {
    // no token
    {
      const { optionalAuth } = await loadMiddlewares('acc');
      const req = { method: 'GET', headers: {} };
      const res = createRes();
      const next = jest.fn();
      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    }
    // bad signature
    {
      const { optionalAuth } = await loadMiddlewares('right');
      const bad = makeToken({}, 'wrong');
      const req = { method: 'GET', headers: { authorization: `Bearer ${bad}` } };
      const res = createRes();
      const next = jest.fn();
      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    }
  });
});
