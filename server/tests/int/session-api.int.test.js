import jwt from 'jsonwebtoken';

import { User, RefreshToken } from '../../models/index.js';
import { hashPassword } from '../../security/passwords.mjs';
import { createRole } from './factories/role.js';
import { createUserInstance } from './factories/user.js';

const PASSWORD = 'password2025';
const USER_AGENT = 'session-api-integration-test';

let passwordHash;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

async function createSessionUser({
  userName = 'session_user',
  roleName = 'SESSION_ROLE',
  ...overrides
} = {}) {
  const role = await createRole({ name: roleName });

  const user = await createUserInstance({
    userName,
    password: passwordHash,
    roleId: role.id,
    firstName: 'John',
    lastName: 'Fox',
    isRestricted: false,
    ...overrides,
  });

  return { role, user: user.get({ plain: true }) };
}

function signIn(userName, password = PASSWORD) {
  return global.api
    .post('/api/session/sign-in')
    .set('User-Agent', USER_AGENT)
    .send({ userName, password });
}

function getRefreshCookie(res) {
  const header = res.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : header ? [header] : [];

  const refreshCookie = cookies.find((cookie) => cookie.startsWith('rt='));

  return refreshCookie ? refreshCookie.split(';')[0] : null;
}

function getRefreshToken(cookie) {
  return cookie?.startsWith('rt=') ? cookie.slice(3) : null;
}

describe('POST /api/session/sign-in', () => {
  test('returns 422 when credentials fail validation', async () => {
    const res = await global.api.post('/api/session/sign-in').send({ userName: 'test-user' });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('returns the same 401 for a wrong password and an unknown user', async () => {
    const { user } = await createSessionUser({ userName: 'login-user' });

    const wrongPassword = await signIn(user.userName, 'wrong-password');

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toEqual({ code: 'ERRORS.INVALID_AUTHORIZATION', data: null });

    const updatedUser = await User.findByPk(user.id, { raw: true });

    expect(updatedUser.failedLoginCount).toBe(1);

    const unknownUser = await signIn('missing-user', PASSWORD);

    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body).toEqual({ code: 'ERRORS.INVALID_AUTHORIZATION', data: null });
  });

  test('creates a session, refresh token record, and usable access token', async () => {
    const { role, user } = await createSessionUser({
      userName: 'successful-user',
      roleName: 'SESSION_ADMIN',
    });

    const res = await signIn(user.userName);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({
      id: user.id,
      userName: user.userName,
      firstName: 'John',
      lastName: 'Fox',
      roleName: role.name,
      roleId: role.id,
    });
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.expiresIn).toBeGreaterThan(0);

    const accessPayload = jwt.verify(res.body.data.token, process.env.JWT_ACCESS_SECRET, {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
    });

    expect(accessPayload).toMatchObject({
      sub: String(user.id),
      uname: user.userName,
      role: role.name,
      roleId: role.id,
    });

    const refreshCookie = getRefreshCookie(res);
    expect(refreshCookie).not.toBeNull();

    const refreshToken = getRefreshToken(refreshCookie);

    const refreshPayload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
    });

    const tokenRow = await RefreshToken.findByPk(refreshPayload.jti, { raw: true });

    expect(tokenRow).not.toBeNull();
    expect(tokenRow.userId).toBe(user.id);
    expect(tokenRow.revokedAt).toBeNull();
    expect(tokenRow.rotatedAt).toBeNull();

    const me = await global.api
      .get('/api/session/me')
      .set('Authorization', `Bearer ${res.body.data.token}`);

    expect(me.status).toBe(200);
    expect(me.body.data).toEqual({
      id: user.id,
      userName: user.userName,
      firstName: 'John',
      lastName: 'Fox',
      roleName: role.name,
      roleId: role.id,
    });
  });
});

describe('POST /api/session/refresh', () => {
  test('rotates the refresh token and prevents reuse of the old token', async () => {
    const { user } = await createSessionUser({ userName: 'refresh-user' });

    const login = await signIn(user.userName);

    expect(login.status).toBe(200);

    const oldCookie = getRefreshCookie(login);
    const oldToken = getRefreshToken(oldCookie);

    const oldPayload = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
    });

    const res = await global.api
      .post('/api/session/refresh')
      .set('User-Agent', USER_AGENT)
      .set('Cookie', oldCookie);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.expiresIn).toBeGreaterThan(0);

    const newCookie = getRefreshCookie(res);
    expect(newCookie).not.toBeNull();
    expect(newCookie).not.toBe(oldCookie);

    const newToken = getRefreshToken(newCookie);

    const newPayload = jwt.verify(newToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
    });

    const oldRow = await RefreshToken.findByPk(oldPayload.jti, { raw: true });

    const newRow = await RefreshToken.findByPk(newPayload.jti, { raw: true });

    expect(oldRow.rotatedAt).not.toBeNull();
    expect(oldRow.replacedByTokenId).toBe(newPayload.jti);
    expect(newRow).not.toBeNull();
    expect(newRow.userId).toBe(user.id);
    expect(newRow.revokedAt).toBeNull();

    const reuse = await global.api
      .post('/api/session/refresh')
      .set('User-Agent', USER_AGENT)
      .set('Cookie', oldCookie);

    expect(reuse.status).toBe(401);
    expect(reuse.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 401 when refresh cookie is missing', async () => {
    const res = await global.api.post('/api/session/refresh');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });
});

describe('POST /api/session/sign-out', () => {
  test('revokes the refresh token and clears the cookie', async () => {
    const { user } = await createSessionUser({ userName: 'signout-user' });

    const login = await signIn(user.userName);

    expect(login.status).toBe(200);

    const refreshCookie = getRefreshCookie(login);
    const refreshToken = getRefreshToken(refreshCookie);

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
    });

    const res = await global.api.post('/api/session/sign-out').set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: null });

    const setCookie = res.headers['set-cookie'] ?? [];

    expect(setCookie.some((cookie) => cookie.startsWith('rt=;'))).toBe(true);

    const tokenRow = await RefreshToken.findByPk(payload.jti, { raw: true });

    expect(tokenRow.revokedAt).not.toBeNull();
  });
});

describe('GET /api/session/me', () => {
  test('returns 401 without an access token', async () => {
    const res = await global.api.get('/api/session/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });
});
