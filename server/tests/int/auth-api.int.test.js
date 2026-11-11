import jwt from 'jsonwebtoken';

import { createRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';

function makeAccessToken(roleId, overrides = {}) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'integration-user', role: 'TEST_ROLE', ...overrides },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

describe('GET /api/auth/permissions', () => {
  test('returns 401 when Authorization header is missing', async () => {
    const res = await global.api.get('/api/auth/permissions');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 401 for an invalid access token', async () => {
    const res = await global.api
      .get('/api/auth/permissions')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns permissions for the authenticated role only', async () => {
    const role = await createRole({ name: 'Auth Test Role' });

    const otherRole = await createRole({ name: 'Other Role' });

    const permissionB = await createOperation({
      roleId: role.id,
      name: 'VIEW_USERS',
      access: true,
      disabled: false,
    });

    const permissionA = await createOperation({
      roleId: role.id,
      name: 'ADD_USER',
      access: false,
      disabled: true,
    });

    await createOperation({
      roleId: otherRole.id,
      name: 'OTHER_ROLE_PERMISSION',
      access: true,
      disabled: false,
    });

    const token = makeAccessToken(role.id);

    const res = await global.api
      .get('/api/auth/permissions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        {
          id: permissionA.id,
          operation: 'ADD_USER',
          access: false,
          disabled: true,
          roleId: role.id,
        },
        {
          id: permissionB.id,
          operation: 'VIEW_USERS',
          access: true,
          disabled: false,
          roleId: role.id,
        },
      ],
    });
  });

  test('returns an empty list when the role has no permissions', async () => {
    const role = await createRole({ name: 'Role Without Permissions' });

    const token = makeAccessToken(role.id);

    const res = await global.api
      .get('/api/auth/permissions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });
});
