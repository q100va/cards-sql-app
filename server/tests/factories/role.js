// server/tests/factories/role.js
import Role from '../../models/role.js';
import Operation from '../../models/operation.js';
import { OPERATIONS } from '../../shared/operations.js';

/** Создать роль (с разумными дефолтами) */
export async function createRole(attrs = {}, { transaction = null } = {}) {
  const defaults = {
    name: `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    description: 'Test role',
  };
  const data = { ...defaults, ...attrs };
  const role = await Role.create(data, { transaction });
  return role.get({ plain: true });
}

/** Найти роль по id (raw) — то, чего не хватает тесту */
export async function findRoleById(id) {
  return Role.findByPk(id, { raw: true });
}

/** Удалить роль (мягко через destroy) */
export async function destroyRoleById(id, { transaction = null } = {}) {
  return Role.destroy({ where: { id }, transaction });
}

/** Посеять записи в Operation для роли по OPERATIONS */
export async function seedOperationsForRole(roleId, { transaction = null } = {}) {
  const rows = OPERATIONS.map((op) => ({
    name: op.operation,
    roleId,
    access: false,
    disabled: op.flag === 'FULL',
  }));
  await Operation.bulkCreate(rows, { transaction });
}

/** Очистить таблицы ролей/операций (аккуратно, только для тестов) */
export async function truncateRolesAndOperations({ cascade = true } = {}) {
  await Operation.destroy({ where: {}, truncate: true, cascade });
  await Role.destroy({ where: {}, truncate: true, cascade });
}
