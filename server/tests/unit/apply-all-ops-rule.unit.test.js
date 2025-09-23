/** @jest-environment node */
// server/tests/unit/apply-all-ops-rule.unit.test.js
import { jest } from '@jest/globals';

let applyAllOpsRule;
let RolePermissionMock;
let updates;

beforeAll(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  // каждый тест — чистый граф модулей
  jest.resetModules();
  updates = [];

  // ---- mock DB (один раз!) ----
  const dummyTx = { commit: jest.fn(), rollback: jest.fn() };
  const query = jest.fn();              // если в коде есть sequelize.query(...)
  const close = jest.fn();
  const transaction = jest.fn(async (arg) => {
    if (typeof arg === 'function') return arg(dummyTx); // managed
    return dummyTx;                                     // unmanaged
  });

  jest.unstable_mockModule('../../database.js', () => ({
    default: { query, close, transaction },
  }));
  // ---- mock модели прав ----
  RolePermissionMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn((vals, opts) => { updates.push({ vals, opts }); return [1]; }),
  };
  jest.unstable_mockModule('../../models/index.js', () => ({
    RolePermission: RolePermissionMock,
  }));

  // ---- mock OPERATIONS ----
  const OPERATIONS = [
    { operation: 'ALL_OPS_ROLES', object: 'roles', accessToAllOps: true },
    { operation: 'VIEW_FULL_ROLES_LIST', object: 'roles', flag: 'FULL' },
    { operation: 'VIEW_LIMITED_ROLES_LIST', object: 'roles', flag: 'LIMITED' },
    { operation: 'ADD_NEW_ROLE', object: 'roles' },
  ];
  jest.unstable_mockModule('../../shared/operations.js', () => ({ OPERATIONS }));

  // импорт тестируемой функции — после моков
  ({ applyAllOpsRule } = await import('../../controllers/apply-all-ops-rule.js'));
});

afterEach(() => {
  jest.clearAllMocks();   // чистим вызовы, но не реализации
});

afterAll(() => {
  jest.restoreAllMocks();
  jest.resetModules();
});

describe('applyAllOpsRule', () => {
  const roleId = 7;

  it('if even one access=false → ALL_OPS=false', async () => {
    RolePermissionMock.findAll.mockResolvedValue([
      { roleId, name: 'ALL_OPS_ROLES', access: true, disabled: false },
      { roleId, name: 'VIEW_FULL_ROLES_LIST', access: false, disabled: false },
      { roleId, name: 'VIEW_LIMITED_ROLES_LIST', access: true, disabled: false },
      { roleId, name: 'ADD_NEW_ROLE', access: true, disabled: false },
    ]);
    // если внутри читается ALL_OPS через findOne — отдаем текущее
    RolePermissionMock.findOne.mockResolvedValue({ roleId, name: 'ALL_OPS_ROLES', access: true, disabled: false });

    await applyAllOpsRule(roleId);

    expect(RolePermissionMock.update).toHaveBeenCalled();
    expect(updates).toEqual([{ vals: { access: false }, opts: { where: { roleId: 7, name: 'ALL_OPS_ROLES' } } }]);
  });

  it('LIMITED=false → LIMITED.disabled=false, FULL.disabled=true и FULL.access=false', async () => {
    RolePermissionMock.findAll.mockResolvedValue([
      { roleId, name: 'ALL_OPS_ROLES', access: false, disabled: false },
      { roleId, name: 'VIEW_FULL_ROLES_LIST', access: true, disabled: false },
      { roleId, name: 'VIEW_LIMITED_ROLES_LIST', access: false, disabled: true },
      { roleId, name: 'ADD_NEW_ROLE', access: true, disabled: false },
    ]);
    RolePermissionMock.findOne.mockResolvedValue({ roleId, name: 'ALL_OPS_ROLES', access: false, disabled: false });

    await applyAllOpsRule(roleId);

    expect(RolePermissionMock.update).toHaveBeenCalled();
    expect(updates).toEqual([
      {
        vals: { disabled: false },
        opts: { where: { roleId: 7, name: 'VIEW_LIMITED_ROLES_LIST' } }
      },
      {
        vals: { access: false, disabled: true },
        opts: { where: { roleId: 7, name: 'VIEW_FULL_ROLES_LIST' } }
      }
    ]);
  });

  it('LIMITED=true && FULL=false → FULL.disabled=false, and LIMITED.disabled=false', async () => {
    RolePermissionMock.findAll.mockResolvedValue([
      { roleId, name: 'ALL_OPS_ROLES', access: false, disabled: false },
      { roleId, name: 'VIEW_FULL_ROLES_LIST', access: false, disabled: true },
      { roleId, name: 'VIEW_LIMITED_ROLES_LIST', access: true, disabled: true },
      { roleId, name: 'ADD_NEW_ROLE', access: false, disabled: false },
    ]);
    RolePermissionMock.findOne.mockResolvedValue({ roleId, name: 'ALL_OPS_ROLES', access: false, disabled: false });

    await applyAllOpsRule(roleId);

    expect(RolePermissionMock.update).toHaveBeenCalled();
    expect(updates).toEqual([
      {
        vals: { disabled: false },
        opts: { where: { roleId: 7, name: 'VIEW_LIMITED_ROLES_LIST' } }
      },
      {
        vals: { disabled: false },
        opts: { where: { roleId: 7, name: 'VIEW_FULL_ROLES_LIST' } }
      }
    ]);
  });

  it('FULL=true (&& LIMITED=true) → FULL.disabled=false, and LIMITED.disabled=true', async () => {
    RolePermissionMock.findAll.mockResolvedValue([
      { roleId, name: 'ALL_OPS_ROLES', access: false, disabled: false },
      { roleId, name: 'VIEW_FULL_ROLES_LIST', access: true, disabled: true },
      { roleId, name: 'VIEW_LIMITED_ROLES_LIST', access: true, disabled: false },
      { roleId, name: 'ADD_NEW_ROLE', access: false, disabled: false },
    ]);
    RolePermissionMock.findOne.mockResolvedValue({ roleId, name: 'ALL_OPS_ROLES', access: false, disabled: false });

    await applyAllOpsRule(roleId);

    expect(RolePermissionMock.update).toHaveBeenCalled();
    expect(updates).toEqual([
      {
        vals: { disabled: true },
        opts: { where: { roleId: 7, name: 'VIEW_LIMITED_ROLES_LIST' } }
      },
      {
        vals: { disabled: false },
        opts: { where: { roleId: 7, name: 'VIEW_FULL_ROLES_LIST' } }
      }
    ]);
  });
});
