/* @jest-environment node */
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// путь к тестируемому модулю
const mwPath = path.resolve(__dirname, '../../middlewares/require-access.js');

// helper: изолированно загружаем middleware, чтобы перечитать ACCESS_SECRET
async function loadMiddleware(secret = 'access-secret') {
  await jest.isolateModulesAsync(async () => {
    process.env.JWT_ACCESS_SECRET = secret;
    const mod = await import(mwPath);
    Object.assign(loadMiddleware, { mod });
  });
  return loadMiddleware.mod;
}

// helper: сборка валидного access-токена
function makeToken(opts = {}, secret = 'access-secret') {
  const {
    userId = 42,
    userName = 'alice',
    role,
    exp = undefined,
    issuer = 'cards-sql-app',
    audience = 'web',
  } = opts;

  const payload = {
    sub: String(userId),
    uname: userName,
  };
  if (role !== undefined) payload.role = role; // ❗если undefined — не добавляем клейм

  const signOpts = { issuer, audience, expiresIn: '1h' };
  if (typeof exp === 'number') {
    delete signOpts.expiresIn;
    payload.exp = exp;
  }
  return jwt.sign(payload, secret, signOpts);
}

// fake res/next
function createRes() {
  return {
    statusCode: 200,
    body: null,
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json:   jest.fn(function (obj)  { this.body = obj; return this; }),
    setHeader: jest.fn(),
  };
}

describe('middleware: requireAccess', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('passes with valid Bearer token and sets req.user', async () => {
    const secret = 's3cr3t';
    const { requireAccess } = await loadMiddleware(secret);

    const token = makeToken({ userId: 101, userName: 'Bob', role: 'USER' }, secret);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createRes();
    const next = jest.fn();

    await requireAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id: 101, userName: 'Bob', roleName: 'USER' });
  });

  test('401 when Authorization header missing', async () => {
    const { requireAccess } = await loadMiddleware('secret');
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    await requireAccess(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('401 when token part is missing (e.g., "Bearer" only)', async () => {
    const { requireAccess } = await loadMiddleware('secret');
    const req = { headers: { authorization: 'Bearer' } };
    const res = createRes();
    const next = jest.fn();

    await requireAccess(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('401 when signature invalid (wrong secret)', async () => {
    const { requireAccess } = await loadMiddleware('right-secret');

    // Подписываем другим секретом → verify упадёт
    const badToken = makeToken({}, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${badToken}` } };
    const res = createRes();
    const next = jest.fn();

    await requireAccess(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('401 when issuer or audience do not match', async () => {
    const { requireAccess } = await loadMiddleware('acc');

    // Неверный issuer
    const badIss = makeToken({ issuer: 'not-your-app' }, 'acc');
    const req1 = { headers: { authorization: `Bearer ${badIss}` } };
    const res1 = createRes();
    const next1 = jest.fn();

    await requireAccess(req1, res1, next1);
    expect(next1).not.toHaveBeenCalled();
    expect(res1.status).toHaveBeenCalledWith(401);

    // Неверный audience
    const badAud = makeToken({ audience: 'mobile' }, 'acc');
    const req2 = { headers: { authorization: `Bearer ${badAud}` } };
    const res2 = createRes();
    const next2 = jest.fn();

    await requireAccess(req2, res2, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(res2.status).toHaveBeenCalledWith(401);
  });

  test('401 when token is expired', async () => {
    const { requireAccess } = await loadMiddleware('acc');

    const past = Math.floor(Date.now() / 1000) - 10; // истёк 10 сек назад
    const expired = makeToken({ exp: past }, 'acc');
    const req = { headers: { authorization: `Bearer ${expired}` } };
    const res = createRes();
    const next = jest.fn();

    await requireAccess(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

});
