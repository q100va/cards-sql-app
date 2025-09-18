// ESM
import sequelize from '../database.js';
import Role from '../models/role.js';
import RoleOperation from '../models/role-permission.js';
import { OPERATIONS } from '../shared/operations.js';
import { applyAllOpsRule } from './apply-all-ops-rule.js';

/** Соберём коды операций один раз */
const ALL_CODES = new Set(OPERATIONS.map(o => o.operation));

/** Синхронизировать одну роль */
export async function syncRolePermissionsFor(roleId) {
  // advisory lock, чтобы не гонялись несколько инстансов
  await sequelize.query('SELECT pg_advisory_lock(42042)');
  try {
    const current = await RoleOperation.findAll({ where: { roleId: roleId }, raw: true });
    const currentMap = new Map(current.map(r => [r.name, r]));

    // добавить недостающие из OPERATIONS
    for (const op of OPERATIONS) {
      if (!currentMap.has(op.operation)) {
        await RoleOperation.create({
          roleId: roleId,
          name: op.operation,
          access: op.accessToAllOps ? true : false,
          disabled: false,
        });
      }
    }

    // обработать «лишние» (в коде их больше нет)
    for (const [code] of currentMap) {
      if (!ALL_CODES.has(code)) {
 /*        // можно мягко выключить...
        await RoleOperation.update(
          { access: false, disabled: true },
          { where: { roleId: roleId, name: code } }
        ); */
        await RoleOperation.destroy({ where: { roleId: roleId, name: code } });
      }
    }

    // применяем правило ALL_OPS
    await applyAllOpsRule(roleId);
  } finally {
    await sequelize.query('SELECT pg_advisory_unlock(42042)');
  }
}

/** Синхронизировать все роли */
export async function syncAllRolesPermissions() {
  const roles = await Role.findAll({ attributes: ['id'], raw: true });
  for (const r of roles) {
    await syncRolePermissionsFor(r.id);
  }
}
