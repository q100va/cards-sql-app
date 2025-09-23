// server/tests/factories/role.js

import {RolePermission, Role} from '../../../models/index.js';
import { OPERATIONS } from '../../../shared/operations.js';

/** Создать роль (с разумными дефолтами) */
export async function createRole(attrs = {}) {
  try{
      const defaults = {
    name: `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    description: 'Test role',
  };
  const data = { ...defaults, ...attrs };
  const role = await Role.create(data);
  return role.get({ plain: true });
  }
  catch(err){
    console.log(err);
  }

}

/** Найти роль по id (raw) — то, чего не хватает тесту */
export async function findRoleById(id) {
  return Role.findByPk(id, { raw: true });
}

/** Удалить роль (мягко через destroy) */
export async function destroyRoleById(id) {
  return Role.destroy({ where: { id }});
}

/** Посеять записи в RolePermission для роли по OPERATIONS */
export async function seedOperationsForRole(roleId) {
  const rows = OPERATIONS.map((op) => ({
    name: op.operation,
    roleId,
    access: false,
    disabled: op.flag === 'FULL',
  }));
  await RolePermission.bulkCreate(rows);
}

/** Очистить таблицы ролей/операций (аккуратно, только для тестов) */
export async function truncateRolesAndOperations({ cascade = true } = {}) {
  await RolePermission.destroy({ where: {}, truncate: true, cascade });
  await Role.destroy({ where: {}, truncate: true, cascade });
}
