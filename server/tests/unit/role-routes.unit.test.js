/* @jest-environment node */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';

import { OPERATIONS, OPERATION_FLAG } from '../../shared/operations.js';

const fakeTx = { id: 'test-transaction' };

const Role = {
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
};

const RolePermission = {
  bulkCreate: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const User = { count: jest.fn() };

const withTransaction = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Role,
  RolePermission,
  User,
}));

jest.unstable_mockModule('../../controllers/with-transaction.js', () => ({ withTransaction }));

jest.unstable_mockModule('../../middlewares/check-auth.js', () =>
({
  default: (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../middlewares/require-permission.js', () =>
({
  requireOperation: () => (_req, _res, next) => next(),
  requireAny: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../middlewares/validate-request.js', () =>
({
  validateRequest: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../../shared/dist/schemas/role.schema.js', () =>
({
  roleNameSchema: {},
  roleDraftSchema: {},
  roleSchema: {},
  roleChangeAccessSchema: {},
  roleIdSchema: {},
}));

const { default: router } = await import('../../routes/roles-api.js');

function makeApp() {
  const app = express();

  app.use(express.json());

  app.use('/', router);

  // Shared error-handler behavior
  // is tested separately.
  app.use((error, _req, res, _next) => {
    res.status(error.status ?? error.statusCode ?? 500).json({
      code: error.code ?? 'ERRORS.INTERNAL',
    });
  });

  return app;
}

function mockPermissionUpdates() {
  let nextId = 1000;

  RolePermission.update.mockImplementation(async (values, options) =>
    [
      1,
      [
        {
          id: nextId++,
          roleId: options.where.roleId,
          access: values.access ?? false,
          disabled: values.disabled ?? false,
        },
      ],
    ]);
}

function findUpdateCall(operationName) {
  return RolePermission.update.mock.calls.find(([, options]) => options?.where?.name === operationName);
}

const superOperation = OPERATIONS.find((operation) =>
  operation.accessToAllOps &&
  OPERATIONS.some((other) =>
    other.object === operation.object &&
    other.flag === OPERATION_FLAG.FULL) &&
  OPERATIONS.some((other) =>
    other.object === operation.object &&
    other.flag === OPERATION_FLAG.LIMITED));

if (!superOperation) {
  throw new Error('Test configuration requires an operation group with ALL_OPS, FULL and LIMITED operations');
}

const operationObject = superOperation.object;

const relatedOperations = OPERATIONS.filter((operation) =>
  operation.object === operationObject &&
  !operation.accessToAllOps);

const fullOperation = relatedOperations.find((operation) => operation.flag === OPERATION_FLAG.FULL);

const limitedOperation = relatedOperations.find((operation) => operation.flag === OPERATION_FLAG.LIMITED);

const regularOperation = relatedOperations.find((operation) => !operation.flag) ?? relatedOperations[0];

describe('Role Routes', () => {
  beforeEach(() => {
    Role.findOne.mockReset();
    Role.create.mockReset();
    Role.update.mockReset();
    Role.findAll.mockReset();
    Role.destroy.mockReset();

    RolePermission.bulkCreate.mockReset();

    RolePermission.update.mockReset();

    RolePermission.findOne.mockReset();

    RolePermission.findAll.mockReset();

    User.count.mockReset();

    withTransaction.mockReset().mockImplementation(async (callback) => callback(fakeTx));
  });

  describe('GET /check-role-name/:name', () => {
    test('returns true when role already exists', async () => {
      Role.findOne.mockResolvedValue({ name: 'admin' });

      const response = await request(makeApp()).get('/check-role-name/admin').expect(200);

      expect(Role.findOne).toHaveBeenCalledWith({
        where: { name: { [Op.iLike]: 'admin' } },
        attributes: ['name'],
        raw: true,
      });

      expect(response.body).toEqual({
        data: true,
        code: 'ERRORS.ROLE.ALREADY_EXISTS',
      });
    });

    test('returns false when role does not exist', async () => {
      Role.findOne.mockResolvedValue(null);

      const response = await request(makeApp()).get('/check-role-name/unknown').expect(200);

      expect(response.body).toEqual({ data: false });
    });

    test('passes lookup errors onward as DATA_CHECK_FAILED', async () => {
      Role.findOne.mockRejectedValue(new Error('DB down'));

      const response = await request(makeApp()).get('/check-role-name/error').expect(500);

      expect(response.body.code).toBe('ERRORS.DATA_CHECK_FAILED');
    });
  });

  describe('POST /create-role', () => {
    test('creates a role and seeds all permissions in one transaction', async () => {
      Role.create.mockResolvedValue({
        id: 42,
        name: 'manager',
        description: 'Manages stuff',
      });

      RolePermission.bulkCreate.mockResolvedValue([]);

      const response = await request(makeApp()).post('/create-role').send({
        name: 'manager',
        description: 'Manages stuff',
      }).expect(200);

      expect(withTransaction).toHaveBeenCalledTimes(1);

      expect(Role.create).toHaveBeenCalledWith({
        name: 'manager',
        description: 'Manages stuff',
      }, { transaction: fakeTx });

      expect(RolePermission.bulkCreate).toHaveBeenCalledTimes(1);

      const [rows, options] = RolePermission.bulkCreate.mock.calls[0];

      expect(options).toEqual({ transaction: fakeTx });

      expect(rows).toHaveLength(OPERATIONS.length);

      expect(rows.map((row) => row.name)).toEqual(OPERATIONS.map((operation) => operation.operation));

      for (const [index, row] of rows.entries()) {
        expect(row).toEqual({
          name: OPERATIONS[index].operation,
          roleId: 42,
          access: false,
          disabled: OPERATIONS[index].flag === OPERATION_FLAG.FULL,
        });
      }

      expect(response.body).toEqual({
        code: 'SUCCESS.CREATED',
        data: 'manager',
      });
    });

    test('passes creation errors onward as DATA_CREATE_FAILED', async () => {
      Role.create.mockRejectedValue(new Error('create failed'));

      const response = await request(makeApp()).post('/create-role').send({
        name: 'manager',
        description: 'description',
      }).expect(500);

      expect(response.body.code).toBe('ERRORS.DATA_CREATE_FAILED');
    });
  });

  describe('PATCH /update-role', () => {
    test('updates an existing role', async () => {
      const updatedRole = {
        id: 1,
        name: 'new-name',
        description: 'new-description',
      };

      Role.update.mockResolvedValue([1, [updatedRole]]);

      const response = await request(makeApp()).patch('/update-role').send(updatedRole).expect(200);

      expect(Role.update).toHaveBeenCalledWith({
        name: 'new-name',
        description: 'new-description',
      }, {
        where: { id: 1 },
        individualHooks: true,
        returning: ['id', 'name', 'description'],
      });

      expect(response.body).toEqual({
        code: 'SUCCESS.UPDATED',
        data: updatedRole,
      });
    });

    test('returns 404 when role does not exist', async () => {
      Role.update.mockResolvedValue([0, []]);

      const response = await request(makeApp()).patch('/update-role').send({
        id: 999,
        name: 'missing',
        description: 'missing',
      }).expect(404);

      expect(response.body.code).toBe('ERRORS.ROLE.NOT_FOUND');
    });

    test('passes update errors onward as DATA_UPDATE_FAILED', async () => {
      Role.update.mockRejectedValue(new Error('update failed'));

      const response = await request(makeApp()).patch('/update-role').send({
        id: 1,
        name: 'name',
        description: 'description',
      }).expect(500);

      expect(response.body.code).toBe('ERRORS.DATA_UPDATE_FAILED');
    });
  });

  describe('PATCH /update-role-access', () => {
    test('turning off FULL enables LIMITED and disables ALL_OPS access', async () => {
      mockPermissionUpdates();

      const response = await request(makeApp()).patch('/update-role-access').send({
        access: false,
        roleId: 2,
        operation: fullOperation,
      }).expect(200);

      const fullCall = findUpdateCall(fullOperation.operation);

      expect(fullCall?.[0]).toEqual({ access: false });

      expect(fullCall?.[1].transaction).toBe(fakeTx);

      const limitedCall = findUpdateCall(limitedOperation.operation);

      expect(limitedCall?.[0]).toEqual({ disabled: false });

      const superCall = findUpdateCall(superOperation.operation);

      expect(superCall?.[0]).toEqual({ access: false });

      expect(RolePermission.findOne).not.toHaveBeenCalled();

      expect(response.body.data.object).toBe(operationObject);
    });

    test('turning on FULL enables ALL_OPS when every related operation has access', async () => {
      mockPermissionUpdates();

      RolePermission.findOne.mockResolvedValue(null);

      await request(makeApp()).patch('/update-role-access').send({
        access: true,
        roleId: 2,
        operation: fullOperation,
      }).expect(200);

      expect(RolePermission.findOne).toHaveBeenCalledTimes(relatedOperations.length);

      const limitedCall = findUpdateCall(limitedOperation.operation);

      expect(limitedCall?.[0]).toEqual({
        disabled: true,
        access: true,
      });

      const superCall = findUpdateCall(superOperation.operation);

      expect(superCall?.[0]).toEqual({ access: true });
    });

    test('does not enable ALL_OPS when another related operation is still off', async () => {
      mockPermissionUpdates();

      RolePermission.findOne.mockResolvedValueOnce({ id: 999 }).mockResolvedValue(null);

      await request(makeApp()).patch('/update-role-access').send({
        access: true,
        roleId: 2,
        operation: regularOperation,
      }).expect(200);

      expect(findUpdateCall(superOperation.operation)).toBeUndefined();

      expect(findUpdateCall(regularOperation.operation)).toBeTruthy();
    });

    test('turning on ALL_OPS enables every related operation', async () => {
      mockPermissionUpdates();

      await request(makeApp()).patch('/update-role-access').send({
        access: true,
        roleId: 2,
        operation: superOperation,
      }).expect(200);

      expect(findUpdateCall(superOperation.operation)?.[0]).toEqual({ access: true });

      for (const operation of relatedOperations) {
        const call = RolePermission.update.mock.calls.find(([values, options]) =>
          options?.where?.name === operation.operation &&
          values?.access === true);

        expect(call).toBeTruthy();
      }

      const limitedDisabled = RolePermission.update.mock.calls.find(([values, options]) =>
        options?.where?.name === limitedOperation.operation &&
        values?.disabled === true);

      expect(limitedDisabled).toBeTruthy();
    });

    test('returns 404 when permission row is missing', async () => {
      RolePermission.update.mockResolvedValue([0, []]);

      const response = await request(makeApp()).patch('/update-role-access').send({
        access: false,
        roleId: 2,
        operation: regularOperation,
      }).expect(404);

      expect(response.body.code).toBe('ERRORS.DATA_NOT_FOUND');
    });

    test('passes permission update failures onward as DATA_UPDATE_FAILED', async () => {
      RolePermission.update.mockRejectedValue(new Error('update failed'));

      const response = await request(makeApp()).patch('/update-role-access').send({
        access: false,
        roleId: 2,
        operation: regularOperation,
      }).expect(500);

      expect(response.body.code).toBe('ERRORS.DATA_UPDATE_FAILED');
    });
  });

  describe('GET /get-roles-names-list', () => {
    test('returns id and name ordered by name', async () => {
      const roles = [
        {
          id: 1,
          name: 'admin',
        },
        {
          id: 2,
          name: 'user',
        },
      ];

      Role.findAll.mockResolvedValue(roles);

      const response = await request(makeApp()).get('/get-roles-names-list').expect(200);

      expect(Role.findAll).toHaveBeenCalledWith({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
        raw: true,
      });

      expect(response.body).toEqual({ data: roles });
    });
  });

  describe('GET /get-roles', () => {
    test('returns roles with permission access entries merged into operations', async () => {
      const roles = [
        {
          id: 1,
          name: 'admin',
          description: 'Administrator',
        },
        {
          id: 2,
          name: 'user',
          description: 'User',
        },
      ];

      const [operationA, operationB] = OPERATIONS;

      Role.findAll.mockResolvedValue(roles);

      RolePermission.findAll.mockResolvedValue([
        {
          id: 101,
          roleId: 1,
          name: operationA.operation,
          access: true,
          disabled: false,
        },
        {
          id: 102,
          roleId: 2,
          name: operationB.operation,
          access: false,
          disabled: true,
        },
      ]);

      const response = await request(makeApp()).get('/get-roles').expect(200);

      expect(Role.findAll).toHaveBeenCalledWith({
        attributes: ['id', 'name', 'description'],
        order: [['id', 'ASC']],
        raw: true,
      });

      expect(RolePermission.findAll).toHaveBeenCalledWith({
        where: { roleId: [1, 2] },
        attributes: ['id', 'roleId', 'name', 'access', 'disabled'],
        raw: true,
      });

      const operations = response.body.data.operations;

      const first = operations.find((operation) => operation.operation === operationA.operation);

      const second = operations.find((operation) => operation.operation === operationB.operation);

      expect(first.rolesAccesses).toContainEqual({
        id: 101,
        roleId: 1,
        access: true,
        disabled: false,
      });

      expect(second.rolesAccesses).toContainEqual({
        id: 102,
        roleId: 2,
        access: false,
        disabled: true,
      });

      expect(response.body.data.roles).toEqual(roles);
    });

    test('passes fetch errors onward as DATA_FETCH_FAILED', async () => {
      Role.findAll.mockRejectedValue(new Error('DB down'));

      const response = await request(makeApp()).get('/get-roles').expect(500);

      expect(response.body.code).toBe('ERRORS.DATA_FETCH_FAILED');
    });
  });

  describe('GET /check-role-before-delete/:id', () => {
    test('returns dependency count and code when users use the role', async () => {
      User.count.mockResolvedValue(2);

      const response = await request(makeApp()).get('/check-role-before-delete/1').expect(200);

      expect(User.count).toHaveBeenCalledWith({
        where: { roleId: '1' },
        raw: true,
      });

      expect(response.body).toEqual({
        data: 2,
        code: 'ERRORS.ROLE.HAS_DEPENDENCIES',
      });
    });

    test('returns zero without dependency code when role is unused', async () => {
      User.count.mockResolvedValue(0);

      const response = await request(makeApp()).get('/check-role-before-delete/1').expect(200);

      expect(response.body).toEqual({ data: 0 });
    });
  });

  describe('DELETE /delete-role/:id', () => {
    test('deletes an unused role in a transaction', async () => {
      User.count.mockResolvedValue(0);

      Role.destroy.mockResolvedValue(1);

      const response = await request(makeApp()).delete('/delete-role/1').expect(200);

      expect(User.count).toHaveBeenCalledWith({
        where: { roleId: '1' },
        transaction: fakeTx,
      });

      expect(Role.destroy).toHaveBeenCalledWith({
        where: { id: '1' },
        individualHooks: true,
        transaction: fakeTx,
      });

      expect(response.body).toEqual({
        code: 'SUCCESS.DELETED',
        data: null,
      });
    });

    test('returns 409 when role still has users', async () => {
      User.count.mockResolvedValue(2);

      const response = await request(makeApp()).delete('/delete-role/1').expect(409);

      expect(response.body.code).toBe('ERRORS.ROLE.HAS_DEPENDENCIES');

      expect(Role.destroy).not.toHaveBeenCalled();
    });

    test('returns 404 when role does not exist', async () => {
      User.count.mockResolvedValue(0);

      Role.destroy.mockResolvedValue(0);

      const response = await request(makeApp()).delete('/delete-role/999').expect(404);

      expect(response.body.code).toBe('ERRORS.DATA_NOT_FOUND');
    });

    test('passes delete errors onward as DATA_DELETE_FAILED', async () => {
      User.count.mockResolvedValue(0);

      Role.destroy.mockRejectedValue(new Error('DB down'));

      const response = await request(makeApp()).delete('/delete-role/1').expect(500);

      expect(response.body.code).toBe('ERRORS.DATA_DELETE_FAILED');
    });
  });
});
