/* @jest-environment node */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

async function loadMiddlewares(secret = 'access-secret') {
  const previousSecret = process.env.JWT_ACCESS_SECRET;

  let mod;

  try {
    if (secret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = secret;
    }

    await jest.isolateModulesAsync(async () => {
      mod = await import('../../middlewares/check-auth.js');
    });

    return mod;
  } finally {
    if (previousSecret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = previousSecret;
    }
  }
}

function makeToken({
  userId = 42,
  userName = 'alice',
  role = 'USER',
  roleId = 2,
  includeRole = true,
  includeRoleId = true,
  issuer = 'cards-sql-app',
  audience = 'web',
  algorithm = 'HS256',
  exp,
} = {}, secret = 'access-secret') {
  const payload = {
    sub: String(userId),
    uname: userName,
  };

  if (includeRole) {
    payload.role = role;
  }

  if (includeRoleId) {
    payload.roleId = roleId;
  }

  const options = {
    issuer,
    audience,
    algorithm,
    expiresIn: '1h',
  };

  if (typeof exp === 'number') {
    delete options.expiresIn;
    payload.exp = exp;
  }

  return jwt.sign(payload, secret, options);
}

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    status: jest.fn(function(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function(body) {
      this.body = body;
      return this;
    }),
  };
}

describe('check-auth middleware', () => {
  describe('requireAuth', () => {
    test('passes OPTIONS requests without authentication', async () => {
      const { requireAuth } = await loadMiddlewares('secret');

      const req = {
        method: 'OPTIONS',
        headers: {},
      };

      const res = createRes();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();

      expect(res.status).not.toHaveBeenCalled();
    });

    test('returns 401 when JWT_ACCESS_SECRET is not configured', async () => {
      const { requireAuth } = await loadMiddlewares(undefined);

      const req = {
        method: 'GET',
        headers: {},
      };

      const res = createRes();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.body).toEqual({
        code: 'ERRORS.UNAUTHORIZED',
        data: null,
      });
    });

    test('returns 401 when Bearer token is missing or malformed', async () => {
      const { requireAuth } = await loadMiddlewares('secret');

      const headers = [{}, { authorization: '' }, { authorization: 'Bearer' }, { authorization: 'Token abc' }];

      for (const header of headers) {
        const req = {
          method: 'GET',
          headers: header,
        };

        const res = createRes();

        const next = jest.fn();

        requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(401);
      }
    });

    test('sets req.user for a valid token', async () => {
      const secret = 'acc';

      const { requireAuth } = await loadMiddlewares(secret);

      const token = makeToken({
        userId: 101,
        userName: 'Bob',
        role: 'ADMIN',
        roleId: 1,
      }, secret);

      const req = {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const res = createRes();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(req.user).toEqual({
        id: 101,
        userName: 'Bob',
        role: 'ADMIN',
        roleId: 1,
      });

      expect(next).toHaveBeenCalledWith();

      expect(res.status).not.toHaveBeenCalled();
    });

    test('allows missing role and sets role to null', async () => {
      const secret = 'acc';

      const { requireAuth } = await loadMiddlewares(secret);

      const token = makeToken({
        userId: 7,
        userName: 'no-role',
        roleId: 3,
        includeRole: false,
      }, secret);

      const req = {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const res = createRes();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(req.user).toEqual({
        id: 7,
        userName: 'no-role',
        role: null,
        roleId: 3,
      });

      expect(next).toHaveBeenCalledWith();
    });

    test('returns 401 for invalid userId or roleId claims', async () => {
      const secret = 'acc';

      const { requireAuth } = await loadMiddlewares(secret);

      const tokens = [makeToken(
        { userId: 'bad' },
        secret
      ),
      makeToken(
        { roleId: 0 },
        secret
      ),
      makeToken(
        { includeRoleId: false },
        secret
      )];

      for (const token of tokens) {
        const req = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
          },
        };

        const res = createRes();

        const next = jest.fn();

        requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(401);
      }
    });

    test('returns 401 for invalid token verification', async () => {
      const secret = 'right';

      const { requireAuth } = await loadMiddlewares(secret);

      const now = Math.floor(Date.now() / 1000);

      const tokens = [
        // Wrong signature.
        makeToken({}, 'wrong'),
        // Wrong issuer.
        makeToken({ issuer: 'other-app' }, secret),
        // Wrong audience.
        makeToken({ audience: 'mobile' }, secret),
        // Algorithm not allowed.
        makeToken({ algorithm: 'HS384' }, secret),
        // More than the
        // 15-second tolerance.
        makeToken({ exp: now - 30 }, secret),
      ];

      for (const token of tokens) {
        const req = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
          },
        };

        const res = createRes();

        const next = jest.fn();

        requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(401);
      }
    });
  });

  describe('optionalAuth', () => {
    test('sets req.user for a valid token and calls next', async () => {
      const secret = 'acc';

      const { optionalAuth } = await loadMiddlewares(secret);

      const token = makeToken({
        userId: 501,
        userName: 'Zoe',
        role: 'USER',
        roleId: 2,
      }, secret);

      const req = {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const next = jest.fn();

      optionalAuth(req, {}, next);

      expect(req.user).toEqual({
        id: 501,
        userName: 'Zoe',
        role: 'USER',
        roleId: 2,
      });

      expect(next).toHaveBeenCalledWith();
    });

    test('allows a valid token without roleId and sets roleId to null', async () => {
      const secret = 'acc';

      const { optionalAuth } = await loadMiddlewares(secret);

      const token = makeToken({
        userId: 12,
        includeRoleId: false,
      }, secret);

      const req = {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const next = jest.fn();

      optionalAuth(req, {}, next);

      expect(req.user).toEqual({
        id: 12,
        userName: 'alice',
        role: 'USER',
        roleId: null,
      });

      expect(next).toHaveBeenCalledWith();
    });

    test('ignores missing or invalid authentication and calls next', async () => {
      const secret = 'right';

      const { optionalAuth } = await loadMiddlewares(secret);

      const requests = [
        {
          method: 'GET',
          headers: {},
        },
        {
          method: 'GET',
          headers: {
            authorization: `Bearer ${makeToken({}, 'wrong')}`,
          },
        },
      ];

      for (const req of requests) {
        const next = jest.fn();

        optionalAuth(req, {}, next);

        expect(req.user).toBeUndefined();

        expect(next).toHaveBeenCalledWith();
      }
    });

    test('calls next when JWT_ACCESS_SECRET is not configured', async () => {
      const { optionalAuth } = await loadMiddlewares(undefined);

      const req = {
        method: 'GET',
        headers: {},
      };

      const next = jest.fn();

      optionalAuth(req, {}, next);

      expect(req.user).toBeUndefined();

      expect(next).toHaveBeenCalledWith();
    });
  });
});
