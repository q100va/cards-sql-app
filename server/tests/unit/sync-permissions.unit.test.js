// server/tests/unit/sync-permissions.unit.test.js
import {jest} from '@jest/globals';

const q = jest.fn();
jest.unstable_mockModule('../../database.js', () => ({ default: { query: q } }));

const Role = { findAll: jest.fn() };
jest.unstable_mockModule('../../models/role.js', () => ({ default: Role }));

const RolePermission = {
  findAll: jest.fn(),
  create : jest.fn(),
  destroy: jest.fn(),
};
jest.unstable_mockModule('../../models/index.js', () => ({ RolePermission }));

// Минимальный OPERATIONS
const OPERATIONS = [
  { operation: 'ALL_OPS_ROLES', object: 'roles', accessToAllOps: true },
  { operation: 'VIEW_FULL_ROLES_LIST', object: 'roles' },
  { operation: 'VIEW_LIMITED_ROLES_LIST', object: 'roles' },
];
jest.unstable_mockModule('../../shared/operations.js', () => ({ OPERATIONS }));

// Мокаем applyAllOpsRule — важно проверить, что вызвали
const applySpy = jest.fn();
jest.unstable_mockModule('../../controllers/apply-all-ops-rule.js', () => ({
  applyAllOpsRule: (rid) => { applySpy(rid); return Promise.resolve(); }
}));

const { syncRolePermissionsFor, syncAllRolesPermissions } = await import('../../controllers/sync-permissions.js');

describe('syncRolePermissionsFor', () => {
  const roleId = 5;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates missing ops with defaults; removes obsolete; calls applyAllOpsRule; uses advisory lock', async () => {
    // В БД сейчас: один актуальный код и один устаревший
    RolePermission.findAll.mockResolvedValue([
      { roleId, name: 'VIEW_FULL_ROLES_LIST', access: false, disabled: false },
      { roleId, name: 'OBSOLETE_CODE',        access: true,  disabled: false },
    ]);

    await syncRolePermissionsFor(roleId);

    // advisory lock/unlock
    expect(q).toHaveBeenNthCalledWith(1, 'SELECT pg_advisory_lock(42042)');
    expect(q).toHaveBeenLastCalledWith     ('SELECT pg_advisory_unlock(42042)');

    // Должны создать: ALL_OPS_ROLES (access=true), VIEW_LIMITED_ROLES_LIST (false)
    expect(RolePermission.create).toHaveBeenCalledWith(
      expect.objectContaining({ roleId, name: 'ALL_OPS_ROLES', access: true, disabled: false })
    );
    expect(RolePermission.create).toHaveBeenCalledWith(
      expect.objectContaining({ roleId, name: 'VIEW_LIMITED_ROLES_LIST', access: false, disabled: false })
    );

    // Должны удалить устаревший
    expect(RolePermission.destroy).toHaveBeenCalledWith({
      where: { roleId, name: 'OBSOLETE_CODE' }
    });

    // И применить правило
    expect(applySpy).toHaveBeenCalledWith(roleId);
  });
});

describe('syncAllRolesPermissions', () => {
  test('iterates over all roles and syncs each', async () => {
    Role.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    RolePermission.findAll.mockResolvedValue([]); // пусто для простоты

    await syncAllRolesPermissions();

    // applyAllOpsRule вызовется по роли 1 и 2 (через syncRolePermissionsFor)
    expect(applySpy).toHaveBeenCalledWith(1);
    expect(applySpy).toHaveBeenCalledWith(2);
  });
});
