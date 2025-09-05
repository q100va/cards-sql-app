// tests/factories/operation.js
import { q } from '../helpers/db.js';
import { OPERATIONS } from '../../shared/operations.js';

/**
 * Создать одну запись в operations.
 * @param {Object} overrides - поля для перезаписи
 * @example
 *  await createOperation({ roleId: r.id, name: 'EDIT_ROLE', access: true })
 */
export async function createOperation(overrides = {}) {
  const op = {
    roleId: overrides.roleId,              // обязательный
    name: overrides.name,                  // обязательный (одно из OPERATIONS[i].operation)
    access: overrides.access ?? false,
    disabled: overrides.disabled ?? false,
  };
  if (!op.roleId || !op.name) {
    throw new Error('createOperation: roleId и name обязательны');
  }

  const { rows } = await q(
    `INSERT INTO operations (role_id, name, access, disabled)
     VALUES ($1, $2, $3, $4)
     RETURNING id, role_id AS "roleId", name, access, disabled`,
    [op.roleId, op.name, op.access, op.disabled]
  );
  return rows[0];
}

/**
 * Засидить ВЕСЬ дефолтный набор операций для роли по списку OPERATIONS.
 * Повторяет поведение твоего /create-role.
 */
export async function seedDefaultOperationsForRole(roleId) {
  const rows = OPERATIONS.map(o => ({
    role_id: roleId,
    name: o.operation,
    access: false,
    disabled: o.flag === 'FULL',
  }));

  const values = [];
  const params = [];
  rows.forEach((r, i) => {
    const base = i * 4;
    params.push(r.role_id, r.name, r.access, r.disabled);
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
  });

  await q(
    `INSERT INTO operations (role_id, name, access, disabled)
     VALUES ${values.join(',')}`,
    params
  );
}

/**
 * Удобно вытащить все операции роли (для ассертов).
 */
export async function getOperationsByRole(roleId) {
  const { rows } = await q(
    `SELECT id, role_id AS "roleId", name, access, disabled
       FROM operations
      WHERE role_id = $1
      ORDER BY name ASC`,
    [roleId]
  );
  return rows;
}

/**
 * Быстро включить/выключить одну операцию роли.
 */
export async function setOperationAccess(roleId, name, { access, disabled }) {
  const { rows } = await q(
    `UPDATE operations
        SET access = COALESCE($3, access),
            disabled = COALESCE($4, disabled)
      WHERE role_id = $1 AND name = $2
      RETURNING id, role_id AS "roleId", name, access, disabled`,
    [roleId, name, access ?? null, disabled ?? null]
  );
  return rows[0] ?? null;
}
