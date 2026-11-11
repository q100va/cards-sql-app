/** @jest-environment node */

import { jest } from '@jest/globals';

const query = jest.fn();
const transaction = jest.fn();

const sequelize = {
  query,
  transaction,
};

const Role = { findAll: jest.fn() };

const RolePermission = {
  findAll: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
};

const applyAllOpsRule = jest.fn();

const OPERATIONS = [
  {
    operation: 'ALL_OPS_ROLES',
    object: 'roles',
    accessToAllOps: true,
  },
  {
    operation: 'VIEW_FULL_ROLES_LIST',
    object: 'roles',
    flag: 'FULL',
  },
  {
    operation: 'VIEW_LIMITED_ROLES_LIST',
    object: 'roles',
    flag: 'LIMITED',
  },
];

jest.unstable_mockModule('../../database.js', () => ({ default: sequelize }));

jest.unstable_mockModule('../../models/index.js', () => ({
  Role,
  RolePermission,
}));

jest.unstable_mockModule('../../shared/operations.js', () => ({ OPERATIONS }));

jest.unstable_mockModule('../../controllers/apply-all-ops-rule.js', () => ({ applyAllOpsRule }));

const {
  syncRolePermissionsFor,
  syncAllRolesPermissions,
} = await import('../../controllers/sync-permissions.js');

describe('sync-permissions', () => {
  let fakeTx;

  beforeEach(() => {
    fakeTx = { id: 'tx-1' };

    jest.clearAllMocks();

    transaction.mockImplementation(async (callback) => callback(fakeTx));

    query.mockResolvedValue(undefined);

    RolePermission.create.mockResolvedValue(undefined);

    RolePermission.destroy.mockResolvedValue(1);

    applyAllOpsRule.mockResolvedValue(undefined);
  });

  describe('syncRolePermissionsFor', () => {
    test('creates missing permissions, removes obsolete ones and normalizes in one transaction', async () => {
      const roleId = 5;

      RolePermission.findAll.mockResolvedValue([
        {
          roleId,
          name: 'VIEW_FULL_ROLES_LIST',
          access: false,
          disabled: true,
        },
        {
          roleId,
          name: 'OBSOLETE_CODE',
          access: true,
          disabled: false,
        },
      ]);

      await syncRolePermissionsFor(roleId);

      expect(transaction).toHaveBeenCalledTimes(1);

      expect(query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(42042)', {
        transaction: fakeTx,
      });

      expect(RolePermission.findAll).toHaveBeenCalledWith({
        where: { roleId },
        raw: true,
        transaction: fakeTx,
      });

      expect(RolePermission.create).toHaveBeenCalledTimes(2);

      expect(RolePermission.create).toHaveBeenCalledWith({
        roleId,
        name: 'ALL_OPS_ROLES',
        access: false,
        disabled: false,
      }, {
        skipAudit: true,
        transaction: fakeTx,
      });

      expect(RolePermission.create).toHaveBeenCalledWith({
        roleId,
        name: 'VIEW_LIMITED_ROLES_LIST',
        access: false,
        disabled: false,
      }, {
        skipAudit: true,
        transaction: fakeTx,
      });

      expect(RolePermission.destroy).toHaveBeenCalledWith({
        where: {
          roleId,
          name: 'OBSOLETE_CODE',
        },
        skipAudit: true,
        transaction: fakeTx,
      });

      expect(applyAllOpsRule).toHaveBeenCalledWith(roleId, fakeTx);
    });

    test('creates missing FULL permission disabled by default', async () => {
      const roleId = 7;

      RolePermission.findAll.mockResolvedValue([
        {
          roleId,
          name: 'ALL_OPS_ROLES',
        },
        {
          roleId,
          name: 'VIEW_LIMITED_ROLES_LIST',
        },
      ]);

      await syncRolePermissionsFor(roleId);

      expect(RolePermission.create).toHaveBeenCalledWith({
        roleId,
        name: 'VIEW_FULL_ROLES_LIST',
        access: false,
        disabled: true,
      }, {
        skipAudit: true,
        transaction: fakeTx,
      });
    });

    test('does not create or remove permissions when already synchronized', async () => {
      const roleId = 8;

      RolePermission.findAll.mockResolvedValue(OPERATIONS.map((operation, index) =>
      ({
        id: index + 1,
        roleId,
        name: operation.operation,
        access: false,
        disabled: operation.flag === 'FULL',
      })));

      await syncRolePermissionsFor(roleId);

      expect(RolePermission.create).not.toHaveBeenCalled();

      expect(RolePermission.destroy).not.toHaveBeenCalled();

      expect(applyAllOpsRule).toHaveBeenCalledWith(roleId, fakeTx);
    });

    test('propagates synchronization failures', async () => {
      RolePermission.findAll.mockRejectedValue(new Error('db failed'));

      await expect(syncRolePermissionsFor(5)).rejects.toThrow('db failed');

      expect(applyAllOpsRule).not.toHaveBeenCalled();
    });
  });

  describe('syncAllRolesPermissions', () => {
    test('synchronizes every role', async () => {
      Role.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      RolePermission.findAll.mockResolvedValue([]);

      await syncAllRolesPermissions();

      expect(Role.findAll).toHaveBeenCalledWith({
        attributes: ['id'],
        raw: true,
      });

      expect(transaction).toHaveBeenCalledTimes(2);

      expect(applyAllOpsRule).toHaveBeenCalledWith(1, expect.any(Object));

      expect(applyAllOpsRule).toHaveBeenCalledWith(2, expect.any(Object));
    });

    test('does nothing when there are no roles', async () => {
      Role.findAll.mockResolvedValue([]);

      await syncAllRolesPermissions();

      expect(transaction).not.toHaveBeenCalled();

      expect(applyAllOpsRule).not.toHaveBeenCalled();
    });
  });
});
