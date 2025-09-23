// server/tests/int/auth-api.int.test.js
// Jest + ESM
import jwt from 'jsonwebtoken';
import { jest } from "@jest/globals";

const SECRET = 'test_secret';
process.env.JWT_ACCESS_SECRET = SECRET;

// --- helper: real token for the "real auth" suite ---
function sign(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'alice', role: 'ADMIN' },
    SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' }
  );
}

describe('GET /api/auth/permissions — REAL auth (401 only)', () => {
  let app, initInfrastructure;

  beforeAll(async () => {
    // реальный middleware, без моков
    ({ default: app, initInfrastructure } = await import('../../app.js'));
    await initInfrastructure();
  });

  it('401 when no auth', async () => {
    const request = (await import('supertest')).default;
    const res = await request(app).get('/api/auth/permissions');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'ERRORS.UNAUTHORIZED' });
  });

  // (опционально) если хочешь проверить happy-path с реальным токеном —
  // можешь добавить сюда тест и посмотреть, что у тебя там ломает 401.
});

describe('GET /api/auth/permissions — HANDLER behavior with AUTH STUB', () => {
  let app, initInfrastructure;
  let RolePermission;

  beforeAll(async () => {
    // Полностью сбросить кеш модулей перед моками
    jest.resetModules();

    // 🔧 Мокаем requireAuth: считаем, что пользователь уже аутентифицирован
    jest.unstable_mockModule('../../middlewares/check-auth.js', () => ({
      requireAuth: (req, _res, next) => { req.user = { id: 1, roleId: 2, userName: 'alice' }; next(); },
      default:     (req, _res, next) => { req.user = { id: 1, roleId: 2, userName: 'alice' }; next(); },
    }));

    // Теперь грузим приложение и модель
    ({ default: app, initInfrastructure } = await import('../../app.js'));
    ({ RolePermission } = await import('../../models/index.js'));
    await initInfrastructure();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns mapped permissions for current role', async () => {
    const request = (await import('supertest')).default;

    const spy = jest.spyOn(RolePermission, 'findAll').mockResolvedValue([
      { id: 10, name: 'VIEW_FULL_USERS_LIST', access: true,  disabled: false, roleId: 2 },
      { id: 11, name: 'ADD_NEW_USER',         access: false, disabled: true,  roleId: 2 },
    ]);

    const res = await request(app)
      .get('/api/auth/permissions')
      // auth заголовок не обязателен, т.к. миддл застаблен, но можно и оставить:
      .set('Authorization', `Bearer dummy`);

    // убедимся, что фильтрация по roleId прошла
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ roleId: 2 }),
      attributes: ['id', 'name', 'access', 'disabled', 'roleId'],
      raw: true,
    }));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { id: 10, operation: 'VIEW_FULL_USERS_LIST', access: true,  disabled: false, roleId: 2 },
      { id: 11, operation: 'ADD_NEW_USER',         access: false, disabled: true,  roleId: 2 },
    ]);
  });

  it('gracefully handles DB error', async () => {
    const request = (await import('supertest')).default;

    jest.spyOn(RolePermission, 'findAll').mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .get('/api/auth/permissions')
      .set('Authorization', `Bearer dummy`);

    // ваш error-handler может вернуть 500/502/503 — главное, не 2xx/401
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.code).toBe('ERRORS.NO_DATA_RECEIVED');
  });
});
