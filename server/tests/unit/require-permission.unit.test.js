// tests/unit/require-permission.unit.test.js
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const RolePermission = {
  count: jest.fn(),
  findAll: jest.fn(),
};

jest.unstable_mockModule('../../models/index.js', () => ({ RolePermission }));

const {
  requireAny,
  requireAll,
  requireOperation,
} = await import('../../middlewares/require-permission.js');

describe('require-permission middlewares', () => {
  const makeReq = (roleId) => roleId == null ? {} : { user: { roleId } };

  const res = {};

  beforeEach(() => {
    RolePermission.count.mockReset();
    RolePermission.findAll.mockReset();
  });

  describe('requireAny', () => {
    test('returns 401 when roleId is missing', async () => {
      const next = jest.fn();

      await requireAny('VIEW')(makeReq(), res, next);

      const error = next.mock.calls[0][0];

      expect(error.status).toBe(401);
      expect(error.code).toBe('ERRORS.UNAUTHORIZED');

      expect(RolePermission.count).not.toHaveBeenCalled();
    });

    test('fails closed when no permission codes are provided', async () => {
      const next = jest.fn();

      await requireAny('', '   ')(makeReq(1), res, next);

      const error = next.mock.calls[0][0];

      expect(error.status).toBe(403);

      expect(error.details).toEqual({ requiredAny: [] });

      expect(RolePermission.count).not.toHaveBeenCalled();
    });

    test('passes when at least one permission is granted', async () => {
      RolePermission.count.mockResolvedValue(1);

      const next = jest.fn();

      await requireAny(' ADD ', 'EDIT', 'ADD')(makeReq(7), res, next);

      expect(RolePermission.count).toHaveBeenCalledTimes(1);

      const query = RolePermission.count.mock.calls[0][0];

      expect(query.where.roleId).toBe(7);

      expect(query.where.access).toBe(true);

      expect(query.where.name[Op.in]).toEqual(['ADD', 'EDIT']);

      expect(next).toHaveBeenCalledWith();
    });

    test('returns 403 when none of the permissions are granted', async () => {
      RolePermission.count.mockResolvedValue(0);

      const next = jest.fn();

      await requireAny('ADD', 'EDIT')(makeReq(2), res, next);

      const error = next.mock.calls[0][0];

      expect(error.status).toBe(403);
      expect(error.code).toBe('ERRORS.FORBIDDEN');

      expect(error.details).toEqual({ requiredAny: ['ADD', 'EDIT'] });
    });

    test('passes database errors to the error handler', async () => {
      const dbError = new Error('db is down');

      RolePermission.count.mockRejectedValue(dbError);

      const next = jest.fn();

      await requireAny('VIEW')(makeReq(5), res, next);

      expect(next).toHaveBeenCalledWith(dbError);

      expect(dbError.status).toBe(500);

      expect(dbError.code).toBe('ERRORS.DATA_FETCH_FAILED');
    });
  });

  describe('requireAll', () => {
    test('returns 401 when roleId is missing', async () => {
      const next = jest.fn();

      await requireAll('VIEW')(makeReq(), res, next);

      const error = next.mock.calls[0][0];

      expect(error.status).toBe(401);
      expect(error.code).toBe('ERRORS.UNAUTHORIZED');

      expect(RolePermission.findAll).not.toHaveBeenCalled();
    });

    test('fails closed when no permission codes are provided', async () => {
      const next = jest.fn();

      await requireAll()(makeReq(1), res, next);

      const error = next.mock.calls[0][0];

      expect(error.status).toBe(403);

      expect(error.details).toEqual({ requiredAll: [] });

      expect(RolePermission.findAll).not.toHaveBeenCalled();
    });

    test('passes when all permissions are granted', async () => {
      RolePermission.findAll.mockResolvedValue([{ name: 'ADD' }, { name: 'EDIT' }, { name: 'DELETE' }]);

      const next = jest.fn();

      await requireAll('ADD', 'EDIT', 'DELETE')(makeReq(9), res, next);

      const query = RolePermission.findAll.mock.calls[0][0];

      expect(query.where.roleId).toBe(9);

      expect(query.where.access).toBe(true);

      expect(query.where.name[Op.in]).toEqual(['ADD', 'EDIT', 'DELETE']);

      expect(query.attributes).toEqual(['name']);

      expect(query.raw).toBe(true);

      expect(next).toHaveBeenCalledWith();
    });

    test('returns 403 with missing permissions', async () => {
      RolePermission.findAll.mockResolvedValue([{ name: 'ADD' }, { name: 'EDIT' }]);

      const next = jest.fn();

      await requireAll('ADD', 'EDIT', 'DELETE')(makeReq(3), res, next);

      const error = next.mock.calls[0][0];

      expect(error.status).toBe(403);
      expect(error.code).toBe('ERRORS.FORBIDDEN');

      expect(error.details).toEqual({
        requiredAll: ['ADD', 'EDIT', 'DELETE'],
        missing: ['DELETE'],
      });
    });

    test('passes database errors to the error handler', async () => {
      const dbError = new Error('boom');

      RolePermission.findAll.mockRejectedValue(dbError);

      const next = jest.fn();

      await requireAll('VIEW')(makeReq(1), res, next);

      expect(next).toHaveBeenCalledWith(dbError);

      expect(dbError.status).toBe(500);

      expect(dbError.code).toBe('ERRORS.DATA_FETCH_FAILED');
    });
  });

  describe('requireOperation', () => {
    test('requires the specified operation', async () => {
      RolePermission.findAll.mockResolvedValue([{ name: 'VIEW_USER' }]);

      const next = jest.fn();

      await requireOperation('VIEW_USER')(makeReq(4), res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
