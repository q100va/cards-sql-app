// tests/factories/operation.js

import { RolePermission } from "../../../models";
import { OPERATIONS } from "../../../shared/operations";


/**
 * Создать одну запись в operations через модель.
 */
export async function createOperation(overrides = {}) {
  const op = {
    roleId: overrides.roleId,              // обязательный
    name: overrides.name,                  // обязательный
    access: overrides.access ?? false,
    disabled: overrides.disabled ?? false,
  };
  if (!op.roleId || !op.name) {
    throw new Error('createOperation: roleId и name обязательны');
  }

  const row = await RolePermission.create(op, { returning: true });
  // plain JS объект:
  return row.get({ plain: true });
}

/**
 * Засидить ВЕСЬ дефолтный набор операций для роли (точно повторяет логику /create-role).
 */
export async function seedDefaultOperationsForRole(roleId) {
  const rows = OPERATIONS.map(o => ({
    roleId,
    name: o.operation,
    access: false,
    disabled: o.flag === 'FULL',
  }));
  await RolePermission.bulkCreate(rows);
}

/**
 * Вытащить все операции роли (для ассертов).
 */
export async function getOperationsByRole(roleId) {
  const rows = await RolePermission.findAll({
    where: { roleId},
    attributes: ['id', 'roleId', 'name', 'access', 'disabled'],
    order: [['name', 'ASC']],
    raw: true,
  });
  return rows;
}

export async function getOperationIdByRoleAndName(roleId, name) {
  const row = await RolePermission.findOne({
    where: { roleId, name },
    attributes: ['id'],
    order: [['name', 'ASC']],
    raw: true,
  });
  return row.id;
}

/**
 * Быстро включить/выключить одну операцию роли.
 */
export async function setOperationAccess(roleId, name, { access, disabled }) {
  const [affected, updated] = await RolePermission.update(
    {
      ...(access   !== undefined ? { access }   : {}),
      ...(disabled !== undefined ? { disabled } : {}),
    },
    {
      where: { roleId, name },
      individualHooks: true,
      returning: true,
    }
  );
  return affected > 0 ? updated[0].get({ plain: true }) : null;
}
