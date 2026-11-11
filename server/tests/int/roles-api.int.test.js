import jwt from 'jsonwebtoken';

import { Role, RolePermission, User } from '../../models/index.js';

import { OPERATIONS, OPERATION_FLAG } from '../../shared/operations.js';

import { createRole, seedOperationsForRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'roles-integration-user', role: 'TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedRole(operationNames = []) {
  const role = await createRole();

  for (const name of operationNames) {
    await createOperation({ roleId: role.id, name, access: true, disabled: false });
  }

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

describe('roles API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .post('/api/roles/create-role')
      .send({ name: 'New Role', description: 'Integration test role' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the authenticated role lacks permission', async () => {
    const actorRole = await createRole();
    const token = makeAccessToken(actorRole.id);

    const res = await auth(global.api.post('/api/roles/create-role'), token).send({
      name: 'Forbidden Role',
      description: 'Integration test role',
    });

    expect(res.status).toBe(403);
  });

  test('checks role names case-insensitively', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_ROLE']);

    await createRole({ name: 'Case Test Role', description: 'Existing integration role' });

    const existing = await auth(
      global.api.get('/api/roles/check-role-name/case%20test%20role'),
      token,
    );

    expect(existing.status).toBe(200);
    expect(existing.body).toEqual({ code: 'ERRORS.ROLE.ALREADY_EXISTS', data: true });

    const missing = await auth(global.api.get('/api/roles/check-role-name/another%20role'), token);

    expect(missing.status).toBe(200);
    expect(missing.body).toEqual({ data: false });
  });

  test('creates a role and seeds all default permissions', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_ROLE']);

    const res = await auth(global.api.post('/api/roles/create-role'), token).send({
      name: 'Created Role',
      description: 'Created by integration test',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.CREATED', data: 'Created Role' });

    const role = await Role.findOne({ where: { name: 'Created Role' }, raw: true });

    expect(role).not.toBeNull();

    const permissions = await RolePermission.findAll({ where: { roleId: role.id }, raw: true });

    expect(permissions).toHaveLength(OPERATIONS.length);
    expect(permissions.every((permission) => permission.access === false)).toBe(true);

    const fullView = permissions.find((permission) => permission.name === 'VIEW_FULL_ROLES_LIST');

    const limitedView = permissions.find(
      (permission) => permission.name === 'VIEW_LIMITED_ROLES_LIST',
    );

    expect(fullView.disabled).toBe(true);
    expect(limitedView.disabled).toBe(false);
  });

  test('updates an existing role', async () => {
    const { token } = await createAuthorizedRole(['EDIT_ROLE']);

    const role = await createRole({ name: 'Old Role Name', description: 'Old description' });

    const res = await auth(global.api.patch('/api/roles/update-role'), token).send({
      id: role.id,
      name: 'Updated Role Name',
      description: 'Updated role description',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 'SUCCESS.UPDATED',
      data: { id: role.id, name: 'Updated Role Name', description: 'Updated role description' },
    });

    const updated = await Role.findByPk(role.id, { raw: true });

    expect(updated.name).toBe('Updated Role Name');
    expect(updated.description).toBe('Updated role description');
  });

  test('updates role access and synchronizes LIMITED/FULL views', async () => {
    const { token } = await createAuthorizedRole(['EDIT_ROLE']);

    const targetRole = await createRole({ name: 'Access Target Role' });

    await seedOperationsForRole(targetRole.id);

    const operation = OPERATIONS.find((item) => item.operation === 'VIEW_LIMITED_ROLES_LIST');

    const res = await auth(global.api.patch('/api/roles/update-role-access'), token).send({
      access: true,
      roleId: targetRole.id,
      operation: { ...operation, rolesAccesses: [] },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.object).toBe('roles');

    const limited = await RolePermission.findOne({
      where: { roleId: targetRole.id, name: 'VIEW_LIMITED_ROLES_LIST' },
      raw: true,
    });

    const full = await RolePermission.findOne({
      where: { roleId: targetRole.id, name: 'VIEW_FULL_ROLES_LIST' },
      raw: true,
    });

    expect(limited.access).toBe(true);
    expect(limited.disabled).toBe(false);
    expect(full.access).toBe(false);
    expect(full.disabled).toBe(false);
  });

  test('returns roles with their permission mappings', async () => {
    const { token } = await createAuthorizedRole(['VIEW_LIMITED_ROLES_LIST']);

    const targetRole = await createRole({
      name: 'Listed Role',
      description: 'Role returned by list endpoint',
    });

    await seedOperationsForRole(targetRole.id);

    await RolePermission.update(
      { access: true },
      { where: { roleId: targetRole.id, name: 'VIEW_LIMITED_ROLES_LIST' } },
    );

    const res = await auth(global.api.get('/api/roles/get-roles'), token);

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: targetRole.id, name: 'Listed Role' })]),
    );
    expect(res.body.data.operations).toHaveLength(OPERATIONS.length);

    const limitedOperation = res.body.data.operations.find(
      (item) => item.operation === 'VIEW_LIMITED_ROLES_LIST',
    );

    expect(limitedOperation).toBeDefined();
    expect(limitedOperation.rolesAccesses).toEqual(
      expect.arrayContaining([expect.objectContaining({ roleId: targetRole.id, access: true })]),
    );
  });

  test('returns the number of users connected to a role', async () => {
    const { token } = await createAuthorizedRole(['DELETE_ROLE']);

    const targetRole = await createRole({ name: 'Role With User' });

    await User.create({
      userName: 'role_dependency_user',
      password: 'not-used-in-this-test',
      firstName: 'Test',
      lastName: 'User',
      roleId: targetRole.id,
    });

    const res = await auth(
      global.api.get(`/api/roles/check-role-before-delete/${targetRole.id}`),
      token,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'ERRORS.ROLE.HAS_DEPENDENCIES', data: 1 });
  });

  test('does not delete a role that still has users', async () => {
    const { token } = await createAuthorizedRole(['DELETE_ROLE']);

    const targetRole = await createRole({ name: 'Protected Role' });

    await User.create({
      userName: 'protected_role_user',
      password: 'not-used-in-this-test',
      firstName: 'Test',
      lastName: 'User',
      roleId: targetRole.id,
    });

    const res = await auth(global.api.delete(`/api/roles/delete-role/${targetRole.id}`), token);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'ERRORS.ROLE.HAS_DEPENDENCIES' });

    const role = await Role.findByPk(targetRole.id, { raw: true });

    expect(role).not.toBeNull();
  });

  test('deletes an unused role and its permissions', async () => {
    const { token } = await createAuthorizedRole(['DELETE_ROLE']);

    const targetRole = await createRole({ name: 'Deletable Role' });

    await seedOperationsForRole(targetRole.id);

    const res = await auth(global.api.delete(`/api/roles/delete-role/${targetRole.id}`), token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.DELETED', data: null });

    const role = await Role.findByPk(targetRole.id, { raw: true });

    expect(role).toBeNull();

    const permissions = await RolePermission.count({ where: { roleId: targetRole.id } });

    expect(permissions).toBe(0);
  });
});
