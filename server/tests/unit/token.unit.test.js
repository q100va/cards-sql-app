/* @jest-environment node */
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Помощник: абсолютные пути к модулям, чтобы мок стабильно резолвился
const tokenPath   = path.resolve(__dirname, '../../controllers/token.js');
const modelsPath  = path.resolve(__dirname, '../../models/index.js');

// Фабрика мока RefreshToken
const makeRefreshMock = () => {
  const create = jest.fn(async (args) => ({ ...args })); // вернём то, что передали
  return { RefreshToken: { create }, __m: { create } };
};

// Хелпер: изолированно загружаем модуль с окружением и моками
async function loadTokenModule({
  nodeEnv = 'test',
  accessSecret = 'access-secret',
  refreshSecret = 'refresh-secret',
  accessTtlSec = '900',   // 15m
  refreshTtlSec = '3600', // 1h
  uuidJti = 'fixed-jti',
} = {}) {
  const refreshMock = makeRefreshMock();

  await jest.isolateModulesAsync(async () => {
    process.env.NODE_ENV = nodeEnv;
    process.env.JWT_ACCESS_SECRET = accessSecret;
    process.env.JWT_REFRESH_SECRET = refreshSecret;
    process.env.JWT_ACCESS_TTL_SEC = accessTtlSec;
    process.env.JWT_REFRESH_TTL_SEC = refreshTtlSec;

    // Мокаем uuid и модели ДО импорта токен-модуля
    jest.unstable_mockModule('uuid', () => ({ v4: jest.fn(() => uuidJti) }));
    jest.unstable_mockModule(modelsPath, () => refreshMock);

    // Импортируем контроллер
    // eslint-disable-next-line no-unused-vars
    const mod = await import(tokenPath);
    Object.assign(loadTokenModule, { mod, refreshMock });
  });

  return { mod: loadTokenModule.mod, refreshMock: loadTokenModule.refreshMock };
}

describe('controllers/token', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('early exit when secrets are missing', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT'); });
    const errSpy  = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Нужен мок моделей, т.к. relative import произойдёт ещё до рантайм-кода
    jest.unstable_mockModule(modelsPath, () => ({ RefreshToken: { create: jest.fn() } }));

    await expect(jest.isolateModulesAsync(async () => {
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      // Импорт без секретов → вызовет process.exit(1)
      await import(tokenPath);
    })).rejects.toThrow('EXIT');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  test('setRefreshCookie uses secure=false in non-prod and true in prod; options are correct', async () => {
    // non-prod
    let { mod } = await loadTokenModule({ nodeEnv: 'development', refreshTtlSec: '7200' }); // 2h
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };

    mod.setRefreshCookie(res, 'rt-value');
    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [name, value, opts] = res.cookie.mock.calls[0];
    expect(name).toBe('rt');
    expect(value).toBe('rt-value');
    expect(opts).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/session',
      maxAge: 7200 * 1000,
    });

    // prod
    ({ mod } = await loadTokenModule({ nodeEnv: 'production', refreshTtlSec: '10' }));
    const res2 = { cookie: jest.fn(), clearCookie: jest.fn() };
    mod.setRefreshCookie(res2, 'rt2');
    const [_n2, _v2, opts2] = res2.cookie.mock.calls[0];
    expect(opts2.secure).toBe(true);
    expect(opts2.maxAge).toBe(10 * 1000);
  });

  test('clearRefreshCookie clears with consistent options', async () => {
    const { mod } = await loadTokenModule({ nodeEnv: 'production' });
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };

    mod.clearRefreshCookie(res);
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
    const [name, opts] = res.clearCookie.mock.calls[0];
    expect(name).toBe('rt');
    expect(opts).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/session',
    });
  });

  test('mintTokenPair: creates DB row and returns correctly signed tokens/claims', async () => {
    const ACCESS_TTL = 5;   // короче — легче сравнивать exp
    const REFRESH_TTL = 60;
    const { mod, refreshMock } = await loadTokenModule({
      nodeEnv: 'test',
      accessSecret: 'acc',
      refreshSecret: 'ref',
      accessTtlSec: String(ACCESS_TTL),
      refreshTtlSec: String(REFRESH_TTL),
      uuidJti: 'fixed-jti',
    });

    const user = { id: 42, userName: 'alice', role: { name: 'ADMIN' } };
    const ctx  = { ua: 'UA/1.0', ip: '127.0.0.1' };

    const before = Math.floor(Date.now() / 1000);
    const { accessToken, refreshToken } = await mod.mintTokenPair(user, ctx);
    const after  = Math.floor(Date.now() / 1000);

    // Проверяем, что запись в БД создана с нужными полями
    expect(refreshMock.__m.create).toHaveBeenCalledTimes(1);
    const [args] = refreshMock.__m.create.mock.calls[0];
    expect(args).toMatchObject({
      id: 'fixed-jti',
      userId: user.id,
      userAgent: ctx.ua,
      ip: ctx.ip,
    });
    // expiresAt ≈ now + REFRESH_TTL
    const expAt = new Date(args.expiresAt).getTime() / 1000;
    expect(expAt).toBeGreaterThanOrEqual(before + REFRESH_TTL - 2);
    expect(expAt).toBeLessThanOrEqual(after + REFRESH_TTL + 2);

    // Декодируем и валидируем клеймы access
    const accessPayload = jwt.verify(accessToken, 'acc');
    expect(accessPayload).toMatchObject({
      iss: 'cards-sql-app',
      aud: 'web',
      sub: String(user.id),
      uname: 'alice',
      role: 'ADMIN',
    });
    // exp ≈ now + ACCESS_TTL
    expect(accessPayload.exp).toBeGreaterThanOrEqual(before + ACCESS_TTL - 2);
    expect(accessPayload.exp).toBeLessThanOrEqual(after + ACCESS_TTL + 2);

    // refresh содержит jti
    const refreshPayload = jwt.verify(refreshToken, 'ref');
    expect(refreshPayload).toMatchObject({
      iss: 'cards-sql-app',
      aud: 'web',
      sub: String(user.id),
      jti: 'fixed-jti',
    });
    expect(refreshPayload.exp).toBeGreaterThanOrEqual(before + REFRESH_TTL - 2);
    expect(refreshPayload.exp).toBeLessThanOrEqual(after + REFRESH_TTL + 2);
  });

test('mintTokenPair: throws if user has no role (no DB write)', async () => {
  const { mod, refreshMock } = await loadTokenModule({
    nodeEnv: 'test',
    accessSecret: 'acc',
    refreshSecret: 'ref',
    accessTtlSec: '60',
    refreshTtlSec: '60',
  });

  // без role
  const userNoRole = { id: 1, userName: 'no-role' };

  await expect(mod.mintTokenPair(userNoRole)).rejects.toThrow('ERRORS.USER_WITHOUT_ROLE');

  // убедимся, что RefreshToken.create не вызывался
  expect(refreshMock.__m.create).not.toHaveBeenCalled();

  // и вариант role с пустой строкой — тоже ошибка
  const userEmptyRole = { id: 2, userName: 'empty', role: { name: '' } };
  await expect(mod.mintTokenPair(userEmptyRole)).rejects.toThrow('ERRORS.USER_WITHOUT_ROLE');
  expect(refreshMock.__m.create).not.toHaveBeenCalled();
});
});
