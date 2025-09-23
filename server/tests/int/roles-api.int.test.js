// tests/roles.api.int.test.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import sequelize from '../../database.js';
import { QueryTypes, Op } from 'sequelize';

import { beforeEach, jest } from '@jest/globals';
import { createRole, findRoleById, seedOperationsForRole } from './factories/role.js';
import { createUser } from './factories/user.js';
import {
  seedDefaultOperationsForRole,
  getOperationsByRole,
  getOperationIdByRoleAndName,
} from './factories/operation.js';
import logger from '../../logging/logger.js';
import { Role, RolePermission } from '../../models/index.js';
import { OPERATIONS } from '../../shared/operations.js';

// маленький хелпер для SELECT-ов (возвращает массив строк)
async function select(text, bind = []) {
  return sequelize.query(text, { bind, type: QueryTypes.SELECT });
}

describe('Roles API (integration)', () => {
  const langRu = { 'x-lang': 'ru' };
  let auth = {};
  //const withHeaders = (req) => req.set({ ...langRu, ...auth });

  beforeAll(async () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not set (check .env.test)');
    }

    // check-auth.js ожидает именно эти iss/aud и поля payload:
    const token = jwt.sign(
      { sub: '1', uname: 'superAdmin', role: 'ADMIN', roleId: 1 },
      secret,
      { issuer: 'cards-sql-app', audience: 'web', expiresIn: '15m' }
    );

    auth = { Authorization: `Bearer ${token}` };

  });

  beforeEach(async () => {

    await Role.destroy({ where: { id: 1, }, truncate: true, cascade: true, restartIdentity: true });

    const role = await createRole({ name: 'ADMIN', description: 'test-admin' });
    //console.log('role', role);
    await RolePermission.destroy({ where: { roleId: 1, } });
    await seedOperationsForRole(1);
    const perms = ['VIEW_FULL_ROLES_LIST', 'VIEW_LIMITED_ROLES_LIST', 'ADD_NEW_ROLE',
      'EDIT_ROLE', 'DELETE_ROLE', 'ADD_NEW_USER', 'EDIT_USER', 'VIEW_LIMITED_USERS_LIST',
    ];

    await RolePermission.update(
      { access: true },
      { where: { roleId: 1, name: { [Op.in]: perms } } }
    );
    //await RolePermission.bulkUpdate();
    const rows = await RolePermission.findAll({
      where: { roleId: 1, access: true },
      raw: true,
    });
    //console.log('RolePermission.findAll', rows);
    if (rows.length === 0) {
      throw new Error('Seeded permission not found via RolePermission.findAll()');
    }

  });

  // ---------- GET /check-role-name/:name ----------
  describe('GET /api/roles/check-role-name/:name', () => {
    it('returns {data:true, code:ROLE.ALREADY_EXISTS} when name is taken', async () => {
      const role = await createRole({ name: 'Manager', description: 'Role description' });

      const { body, status } = await global.api
        .get(`/api/roles/check-role-name/${encodeURIComponent(role.name)}`)
        .set({ ...langRu, ...auth });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          data: true,
          code: 'ROLE.ALREADY_EXISTS',
        })
      );
    });

    it('returns {data:false} when name is free (no code)', async () => {
      const { body, status } = await global.api
        .get('/api/roles/check-role-name/UniqueName123')
        .set({ ...langRu, ...auth });

      expect(status).toBe(200);
      expect(body.data).toBe(false);
      expect(body.code).toBeUndefined();
    });
  });

  // ---------- POST /create-role ----------
  describe('POST /api/roles/create-role', () => {
    it('creates role and seeds default operations; returns code ROLE.CREATED and data=name', async () => {
      const payload = { name: 'Editors', description: 'Can edit stuff' };

      const { body, status } = await global.api
        .post('/api/roles/create-role')
        .set({ ...langRu, ...auth })
        .send(payload);

      expect(status).toBe(200);
      expect(body.code).toBe('ROLE.CREATED');
      expect(body.data).toBe('Editors');

      // Роль действительно создалась (имя хранится lowercased)
      const roleRows = await select(
        `SELECT id, name, description FROM roles WHERE name = $1`,
        [payload.name]
      );
      expect(roleRows.length).toBe(1);

      const roleId = roleRows[0].id;

      // Операции насыпались по списку OPERATIONS?
      const ops = await getOperationsByRole(roleId);
      expect(ops.length).toBe(OPERATIONS.length);

      // Проверим дефолты: FULL → disabled=true, остальное disabled=false; access=false у всех
      const fullOps = new Set(
        OPERATIONS.filter(o => o.flag === 'FULL').map(o => o.operation)
      );
      for (const op of ops) {
        if (fullOps.has(op.name)) {
          expect(op.disabled).toBe(true);
        } else {
          expect(op.disabled).toBe(false);
        }
        expect(op.access).toBe(false);
      }
    });
  });

  // ---------- PATCH /update-role ----------
  describe('PATCH /api/roles/update-role', () => {
    it('updates role and returns code ROLE.UPDATED + updated object', async () => {
      const role = await createRole({ name: 'observer', description: 'Role description' });

      const { body, status } = await global.api
        .patch('/api/roles/update-role')
        .set({ ...langRu, ...auth })
        .send({ id: role.id, name: 'viewer', description: 'read-only' });

      expect(status).toBe(200);
      expect(body.code).toBe('ROLE.UPDATED');
      expect(body.data).toEqual(
        expect.objectContaining({
          id: role.id,
          name: 'viewer',
          description: 'read-only',
        })
      );

      const updated = await findRoleById(role.id);
      expect(updated.name).toBe('viewer');
      expect(updated.description).toBe('read-only');
    });

    it('404 + ERRORS.ROLE.NOT_FOUND when role missing', async () => {
      const { body, status } = await global.api
        .patch('/api/roles/update-role')
        .set({ ...langRu, ...auth })
        .send({ id: 999999, name: 'xxxxxx', description: 'Role description' });

      expect(status).toBe(404);
      expect(body.code).toBe('ERRORS.ROLE.NOT_FOUND');
    });
  });
  // ---------- PATCH /update-role-access ----------
  describe('PATCH /api/roles/update-role-access', () => {
    it('enabling ALL_OPS_* enables all related ops and returns both updated ops', async () => {
      const role = await createRole({ name: 'opsall', description: 'Role description' });
      await seedDefaultOperationsForRole(role.id);
      const opId = await getOperationIdByRoleAndName(role.id, 'ALL_OPS_ROLES')

      const { body, status } = await global.api
        .patch('/api/roles/update-role-access')
        .set({ ...langRu, ...auth })
        .send({
          access: true,
          roleId: role.id,
          operation: {
            description: 'any',
            accessToAllOps: true,
            object: 'roles',
            objectName: 'any',
            operation: 'ALL_OPS_ROLES',
            operationName: 'any',
            rolesAccesses: [
              {
                id: opId,
                roleId: role.id,
                access: false,
                disabled: false,
              }]
          },
        });

      expect(status).toBe(200);
      expect(body.data.object).toBe('roles');
      expect(Array.isArray(body.data.ops)).toBe(true);
      expect(body.data.ops.length).toBeGreaterThan(1);

      // Все операции этого объекта должны стать access=true
      const after = await getOperationsByRole(role.id);
      const affected = after.filter((x) =>
        OPERATIONS.some((o) => o.object === 'roles' && o.operation === x.name)
      );
      expect(affected.every((x) => x.access === true)).toBe(true);
    });

    it('turning off any single op disables ALL_OPS_* (if existed)', async () => {
      const role = await createRole({ name: 'cascade', description: 'Role description' });
      await seedDefaultOperationsForRole(role.id);

      const opId = await getOperationIdByRoleAndName(role.id, 'ALL_OPS_ROLES');

      await global.api.patch('/api/roles/update-role-access').send({
        access: true,
        roleId: role.id,
        operation: {
          description: 'any',
          accessToAllOps: true,
          object: 'users',
          objectName: 'any',
          operation: 'ALL_OPS_USERS',
          operationName: 'any',
          rolesAccesses: [
            {
              id: opId,
              roleId: role.id,
              access: false,
              disabled: false,
            }]
        },
      });

      const { status } = await global.api
        .patch('/api/roles/update-role-access')
        .set({ ...langRu, ...auth })
        .send({
          access: false,
          roleId: role.id,
          operation: {
            description: 'any',
            accessToAllOps: false,
            object: 'users',
            objectName: 'any',
            operation: 'ADD_NEW_USER',
            operationName: 'any',
            rolesAccesses: [
              {
                id: opId,
                roleId: role.id,
                access: true,
                disabled: false,
              }]
          },
        });

      expect(status).toBe(200);

      const ops = await getOperationsByRole(role.id);
      const allOpsRow = ops.find((x) => x.name === 'ALL_OPS_USERS');
      expect(allOpsRow.access).toBe(false); // ALL_OPS выключился
    });

    it('LIMITED/FULL complementary pair updates disabled/access correctly', async () => {
      const role = await createRole({ name: 'pairtest', description: 'Role description' });
      await seedDefaultOperationsForRole(role.id);

      // Включаем LIMITED → FULL получает disabled=false (access не синхронизируется)

      const opIdLimited = await getOperationIdByRoleAndName(role.id, 'VIEW_LIMITED_USERS_LIST');

      await global.api.patch('/api/roles/update-role-access')
        .set(auth)
        .send({
          access: true,
          roleId: role.id,
          operation: {
            description: 'any',
            accessToAllOps: false,
            object: 'users',
            objectName: 'any',
            operation: 'VIEW_LIMITED_USERS_LIST',
            operationName: 'any',
            flag: "LIMITED",
            rolesAccesses: [
              {
                id: opIdLimited,
                roleId: role.id,
                access: false,
                disabled: false,
              }]
          },
        });

      let ops = await getOperationsByRole(role.id);
      logger.debug(ops, 'ops');
      let limitedRow = ops.find((x) => x.name === 'VIEW_LIMITED_USERS_LIST');
      let fullRow = ops.find((x) => x.name === 'VIEW_FULL_USERS_LIST');
      logger.debug(limitedRow, 'limitedRow');
      logger.debug(fullRow, 'fullRow');
      expect(limitedRow.access).toBe(true);
      expect(fullRow.disabled).toBe(false);

      // Включаем FULL → LIMITED.disabled=true
      const opIdFull = await getOperationIdByRoleAndName(role.id, 'VIEW_FULL_USERS_LIST');

      await global.api.patch('/api/roles/update-role-access')
        .set(auth)
        .send({
          access: true,
          roleId: role.id,
          operation: {
            description: 'any',
            accessToAllOps: false,
            object: 'users',
            objectName: 'any',
            operation: 'VIEW_FULL_USERS_LIST',
            operationName: 'any',
            flag: "FULL",
            rolesAccesses: [
              {
                id: opIdFull,
                roleId: role.id,
                access: false,
                disabled: false,
              }]
          },
        });

      ops = await getOperationsByRole(role.id);
      const limitedAfter = ops.find((x) => x.name === 'VIEW_LIMITED_USERS_LIST');
      const fullAfter = ops.find((x) => x.name === 'VIEW_FULL_USERS_LIST');
      expect(fullAfter.access).toBe(true);
      expect(limitedAfter.disabled).toBe(true);
    });
  });

  // ---------- GET /get-roles-names-list ----------
  describe('GET /api/roles/get-roles-names-list', () => {
    it('returns {id,name} array sorted by name', async () => {
      await createRole({ name: 'zeta', description: 'Role description' });
      await createRole({ name: 'alpha', description: 'Role description' });

      const { body, status } = await global.api
        .get('/api/roles/get-roles-names-list')
        .set({ ...langRu, ...auth });

      expect(status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);

      const names = body.data.map((r) => r.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });
  });

  // ---------- GET /get-roles ----------
  describe('GET /api/roles/get-roles', () => {
    it('returns roles + operations with rolesAccesses for each role', async () => {
      const r1 = await createRole({ name: 'role1', description: 'Role description' });
      const r2 = await createRole({ name: 'role2', description: 'Role description' });
      await seedDefaultOperationsForRole(r1.id);
      await seedDefaultOperationsForRole(r2.id);

      const { body, status } = await global.api.get('/api/roles/get-roles').set(auth);;

      expect(status).toBe(200);
      expect(body.data).toBeTruthy();
      const { roles, operations } = body.data;
      //console.log('roles', roles);
      //console.log('operations', operations)
      expect(roles.length).toBeGreaterThanOrEqual(2);
      expect(operations.length).toBe(OPERATIONS.length);

      for (const op of operations) {
        expect(Array.isArray(op.rolesAccesses)).toBe(true);
        expect(op.rolesAccesses.length).toBeGreaterThanOrEqual(roles.length);
      }
    });
  });

  // ---------- GET /check-role-before-delete/:id ----------
  describe('GET /api/roles/check-role-before-delete/:id', () => {
    it('returns {data:0} if no users attached (no code)', async () => {
      const role = await createRole({ name: 'empty', description: 'Role description' });

      const { body, status } = await global.api
        .get(`/api/roles/check-role-before-delete/${role.id}`)
        .set(auth);

      expect(status).toBe(200);
      expect(body.data).toBe(0);
      expect(body.code).toBeUndefined();
    });

    it('returns {data:count, code:ROLE.HAS_DEPENDENCIES} if users attached', async () => {
      const role = await createRole({ name: 'busy', description: 'Role description' });
      await createUser({ roleId: role.id, email: 'u1@example.com' });
      await createUser({ roleId: role.id, email: 'u2@example.com' });

      const { body, status } = await global.api
        .get(`/api/roles/check-role-before-delete/${role.id}`)
        .set(auth);

      expect(status).toBe(200);
      expect(body.data).toBe(2);
      expect(body.code).toBe('ROLE.HAS_DEPENDENCIES');
    });
  });

  // ---------- DELETE /delete-role/:id ----------
  describe('DELETE /api/roles/delete-role/:id', () => {
    it('deletes role without dependencies → code ROLE.DELETED, ops are removed', async () => {
      const role = await createRole({ name: 'tempdel', description: 'Role description' });
      await seedDefaultOperationsForRole(role.id);

      const { body, status } = await global.api
        .delete(`/api/roles/delete-role/${role.id}`)
        .set({ ...langRu, ...auth });

      expect(status).toBe(200);
      expect(body.code).toBe('ROLE.DELETED');
      expect(body.data).toBeNull();

      // роли нет
      const roles = await select(`SELECT id FROM roles WHERE id = $1`, [role.id]);
      expect(roles.length).toBe(0);

      // операций роли нет
      const ops = await getOperationsByRole(role.id);
      expect(ops.length).toBe(0);
    });

    it('404 + ERRORS.ROLE.NOT_FOUND when deleting missing role', async () => {
      const { body, status } = await global.api
        .delete(`/api/roles/delete-role/999999`)
        .set({ ...langRu, ...auth });

      expect(status).toBe(404);
      expect(body.code).toBe('ERRORS.ROLE.NOT_FOUND');
    });
  });
});
