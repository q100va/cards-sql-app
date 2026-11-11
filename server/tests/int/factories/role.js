import { Role } from '../../../models/index.js';
import { grantOperationsForRole } from './operation.js';
export { seedDefaultOperationsForRole as seedOperationsForRole } from './operation.js';

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

export async function createRoleWithOperations(operationNames = [], overrides = {}) {
  const role = await createRole(overrides);
  await grantOperationsForRole(role.id, operationNames);
  return role;
}
