/* @jest-environment node */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const refreshCreate = jest.fn();
const uuidv4 = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({ RefreshToken: { create: refreshCreate } }));

jest.unstable_mockModule('uuid', () => ({ v4: uuidv4 }));

const ENV_KEYS = ['NODE_ENV', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ACCESS_TTL_SEC', 'JWT_REFRESH_TTL_SEC'];

async function loadTokenModule({
  nodeEnv = 'test',
  accessSecret = 'access-secret',
  refreshSecret = 'refresh-secret',
  accessTtlSec = '900',
  refreshTtlSec = '3600',
} = {}) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  try {
    process.env.NODE_ENV = nodeEnv;

    if (accessSecret === null) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = accessSecret;
    }

    if (refreshSecret === null) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = refreshSecret;
    }

    process.env.JWT_ACCESS_TTL_SEC = accessTtlSec;

    process.env.JWT_REFRESH_TTL_SEC = refreshTtlSec;

    let mod;

    await jest.isolateModulesAsync(async () => {
      mod = await import('../../controllers/token.js');
    });

    return mod;
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

describe('token', () => {
  beforeEach(() => {
    refreshCreate.mockReset();
    uuidv4.mockReset();

    uuidv4.mockReturnValue('fixed-jti');

    refreshCreate.mockImplementation(async (values) => ({ ...values }));
  });

  test('throws when JWT secrets are not configured', async () => {
    await expect(loadTokenModule({ accessSecret: null })).rejects.toThrow('JWT secrets are not configured');

    await expect(loadTokenModule({ refreshSecret: null })).rejects.toThrow('JWT secrets are not configured');
  });

  test('setRefreshCookie uses non-production cookie options', async () => {
    const mod = await loadTokenModule({
      nodeEnv: 'development',
      refreshTtlSec: '7200',
    });

    const res = { cookie: jest.fn() };

    mod.setRefreshCookie(res, 'refresh-value');

    expect(res.cookie).toHaveBeenCalledWith('rt', 'refresh-value', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/session',
      maxAge: 7200 * 1000,
    });
  });

  test('setRefreshCookie uses production cookie options', async () => {
    const mod = await loadTokenModule({
      nodeEnv: 'production',
      refreshTtlSec: '60',
    });

    const res = { cookie: jest.fn() };

    mod.setRefreshCookie(res, 'refresh-value');

    expect(res.cookie).toHaveBeenCalledWith('rt', 'refresh-value', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/session',
      maxAge: 60 * 1000,
    });
  });

  test('clearRefreshCookie uses matching cookie options', async () => {
    const mod = await loadTokenModule({ nodeEnv: 'production' });

    const res = { clearCookie: jest.fn() };

    mod.clearRefreshCookie(res);

    expect(res.clearCookie).toHaveBeenCalledWith('rt', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/session',
    });
  });

  test('uses default TTL values when configured TTLs are invalid', async () => {
    const mod = await loadTokenModule({
      accessTtlSec: 'invalid',
      refreshTtlSec: '0',
    });

    expect(mod.ACCESS_TTL_SEC).toBe(15 * 60);

    const res = { cookie: jest.fn() };

    mod.setRefreshCookie(res, 'rt');

    const options = res.cookie.mock.calls[0][2];

    expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  test('mintTokenPair stores refresh token metadata and returns valid signed tokens', async () => {
    const ACCESS_TTL = 60;
    const REFRESH_TTL = 3600;

    const mod = await loadTokenModule({
      accessSecret: 'acc',
      refreshSecret: 'ref',
      accessTtlSec: String(ACCESS_TTL),
      refreshTtlSec: String(REFRESH_TTL),
    });

    const transaction = { id: 'tx-1' };

    const user = {
      id: 42,
      userName: 'alice',
      roleId: 1,
      role: { name: 'ADMIN' },
    };

    const before = Date.now();

    const {
      accessToken,
      refreshToken,
    } = await mod.mintTokenPair(user, {
      ua: 'UA/1.0',
      ip: '127.0.0.1',
      transaction,
    });

    const after = Date.now();

    expect(refreshCreate).toHaveBeenCalledTimes(1);

    const [values, options] = refreshCreate.mock.calls[0];

    expect(values).toMatchObject({
      id: 'fixed-jti',
      userId: 42,
      userAgent: 'UA/1.0',
      ip: '127.0.0.1',
    });

    expect(options).toEqual({ transaction });

    expect(values.expiresAt.getTime()).toBeGreaterThanOrEqual(before + REFRESH_TTL * 1000);

    expect(values.expiresAt.getTime()).toBeLessThanOrEqual(after + REFRESH_TTL * 1000);

    const accessPayload = jwt.verify(accessToken, 'acc', {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
    });

    expect(accessPayload).toMatchObject({
      sub: '42',
      uname: 'alice',
      role: 'ADMIN',
      roleId: 1,
    });

    expect(accessPayload.exp - accessPayload.iat).toBe(ACCESS_TTL);

    const refreshPayload = jwt.verify(refreshToken, 'ref', {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
    });

    expect(refreshPayload).toMatchObject({
      sub: '42',
      uname: 'alice',
      role: 'ADMIN',
      roleId: 1,
      jti: 'fixed-jti',
    });

    expect(refreshPayload.exp - refreshPayload.iat).toBe(REFRESH_TTL);
  });

  test('mintTokenPair rejects users without a valid role', async () => {
    const mod = await loadTokenModule();

    const invalidUsers = [
      {
        id: 1,
        userName: 'missing-role',
        roleId: 1,
      },
      {
        id: 2,
        userName: 'empty-role',
        roleId: 1,
        role: { name: '   ' },
      },
      {
        id: 3,
        userName: 'missing-role-id',
        role: { name: 'USER' },
      },
      {
        id: 4,
        userName: 'invalid-role-id',
        roleId: 0,
        role: { name: 'USER' },
      },
    ];

    for (const user of invalidUsers) {
      await expect(mod.mintTokenPair(user)).rejects.toMatchObject({
        message: 'ERRORS.USER_WITHOUT_ROLE',
        code: 'ERRORS.USER_WITHOUT_ROLE',
        status: 500,
      });
    }

    expect(refreshCreate).not.toHaveBeenCalled();
  });
});
