/** @jest-environment node */

import { jest } from '@jest/globals';

const transaction = { id: 'tx-1' };

const sequelize = { transaction: jest.fn() };

const RolePermission = {
  findAll: jest.fn(),
  update: jest.fn(),
};

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
  {
    operation: 'ADD_NEW_ROLE',
    object: 'roles',
  },
];

jest.unstable_mockModule('../../database.js', () => ({ default: sequelize }));

jest.unstable_mockModule('../../models/index.js', () => ({ RolePermission }));

jest.unstable_mockModule('../../shared/operations.js', () => ({ OPERATIONS }));

const { applyAllOpsRule } = await import('../../controllers/apply-all-ops-rule.js');

function permission(name, access, disabled = false) {
  return {
    roleId: 7,
    name,
    access,
    disabled,
  };
}

function expectUpdate(callNumber, name, values, tx = transaction) {
  expect(RolePermission.update).toHaveBeenNthCalledWith(callNumber, values, {
    where: {
      roleId: 7,
      name,
    },
    skipAudit: true,
    transaction: tx,
  });
}

describe('applyAllOpsRule', () => {
  beforeEach(() => {
    RolePermission.findAll.mockReset();

    RolePermission.update.mockReset().mockResolvedValue([1]);

    sequelize.transaction.mockReset().mockImplementation(async (callback) => callback(transaction));
  });

  test('turns ALL_OPS off when any related permission is off', async () => {
    RolePermission.findAll.mockResolvedValue([permission(
      'ALL_OPS_ROLES',
      true
    ),
    permission(
      'VIEW_FULL_ROLES_LIST',
      true,
      false
    ),
    permission(
      'VIEW_LIMITED_ROLES_LIST',
      true,
      true
    ),
    permission(
      'ADD_NEW_ROLE',
      false
    )]);

    await applyAllOpsRule(7);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);

    expect(RolePermission.findAll).toHaveBeenCalledWith({
      where: {
        roleId: 7,
        name: ['ALL_OPS_ROLES', 'VIEW_FULL_ROLES_LIST', 'VIEW_LIMITED_ROLES_LIST', 'ADD_NEW_ROLE'],
      },
      raw: true,
      transaction,
    });

    expect(RolePermission.update).toHaveBeenCalledTimes(1);

    expectUpdate(1, 'ALL_OPS_ROLES', { access: false });
  });

  test('when LIMITED is off, enables LIMITED control and disables FULL access', async () => {
    RolePermission.findAll.mockResolvedValue([permission(
      'ALL_OPS_ROLES',
      false
    ),
    permission(
      'VIEW_FULL_ROLES_LIST',
      true,
      false
    ),
    permission(
      'VIEW_LIMITED_ROLES_LIST',
      false,
      true
    ),
    permission(
      'ADD_NEW_ROLE',
      true
    )]);

    await applyAllOpsRule(7);

    expect(RolePermission.update).toHaveBeenCalledTimes(2);

    expectUpdate(1, 'VIEW_LIMITED_ROLES_LIST', { disabled: false });

    expectUpdate(2, 'VIEW_FULL_ROLES_LIST', {
      access: false,
      disabled: true,
    });
  });

  test('when LIMITED is on and FULL is off, enables both view controls', async () => {
    RolePermission.findAll.mockResolvedValue([permission(
      'ALL_OPS_ROLES',
      false
    ),
    permission(
      'VIEW_FULL_ROLES_LIST',
      false,
      true
    ),
    permission(
      'VIEW_LIMITED_ROLES_LIST',
      true,
      true
    ),
    permission(
      'ADD_NEW_ROLE',
      false
    )]);

    await applyAllOpsRule(7);

    expect(RolePermission.update).toHaveBeenCalledTimes(2);

    expectUpdate(1, 'VIEW_LIMITED_ROLES_LIST', { disabled: false });

    expectUpdate(2, 'VIEW_FULL_ROLES_LIST', { disabled: false });
  });

  test('turns ALL_OPS on when every related permission is enabled', async () => {
    RolePermission.findAll.mockResolvedValue([permission(
      'ALL_OPS_ROLES',
      false
    ),
    permission(
      'VIEW_FULL_ROLES_LIST',
      true,
      false
    ),
    permission(
      'VIEW_LIMITED_ROLES_LIST',
      true,
      false
    ),
    permission(
      'ADD_NEW_ROLE',
      true
    )]);

    await applyAllOpsRule(7);

    expect(RolePermission.update).toHaveBeenCalledTimes(2);

    expectUpdate(1, 'VIEW_LIMITED_ROLES_LIST', { disabled: true });

    expectUpdate(2, 'ALL_OPS_ROLES', { access: true });
  });

  test('does not write when permissions are already normalized', async () => {
    RolePermission.findAll.mockResolvedValue([permission(
      'ALL_OPS_ROLES',
      true
    ),
    permission(
      'VIEW_FULL_ROLES_LIST',
      true,
      false
    ),
    permission(
      'VIEW_LIMITED_ROLES_LIST',
      true,
      true
    ),
    permission(
      'ADD_NEW_ROLE',
      true
    )]);

    await applyAllOpsRule(7);

    expect(RolePermission.update).not.toHaveBeenCalled();
  });

  test('uses an existing transaction when one is supplied', async () => {
    const existingTx = { id: 'existing-tx' };

    RolePermission.findAll.mockResolvedValue([permission(
      'ALL_OPS_ROLES',
      true
    ),
    permission(
      'VIEW_FULL_ROLES_LIST',
      true,
      false
    ),
    permission(
      'VIEW_LIMITED_ROLES_LIST',
      true,
      true
    ),
    permission(
      'ADD_NEW_ROLE',
      false
    )]);

    await applyAllOpsRule(7, existingTx);

    expect(sequelize.transaction).not.toHaveBeenCalled();

    expect(RolePermission.findAll).toHaveBeenCalledWith(expect.objectContaining({
      transaction: existingTx,
    }));

    expectUpdate(1, 'ALL_OPS_ROLES', { access: false }, existingTx);
  });
});
