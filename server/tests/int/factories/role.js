import { RolePermission, Role } from '../../../models/index.js';
import { OPERATIONS } from '../../../shared/operations.js';

/**
 * Create a role with sensible test defaults.
 */
export async function createRole(attrs = {}) {
  const defaults = {
    name: `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    description: 'Test role',
  };

  const data = { ...defaults, ...attrs };
  const role = await Role.create(data);

  return role.get({ plain: true });
}

/**
 * Find a role by id and return a plain object.
 */
export async function findRoleById(id) {
  return Role.findByPk(id, { raw: true });
}

/**
 * Delete a role by id.
 */
export async function destroyRoleById(id) {
  return Role.destroy({ where: { id } });
}

/**
 * Seed the default permission set for a role.
 */
export async function seedOperationsForRole(roleId) {
  const rows = OPERATIONS.map((op) => ({
    name: op.operation,
    roleId,
    access: false,
    disabled: op.flag === 'FULL',
  }));

  await RolePermission.bulkCreate(rows);
}

/**
 * Truncate role and permission tables.
 * Intended for integration tests only.
 */
export async function truncateRolesAndOperations({ cascade = true } = {}) {
  await RolePermission.destroy({ where: {}, truncate: true, cascade });
  await Role.destroy({ where: {}, truncate: true, cascade });
}
