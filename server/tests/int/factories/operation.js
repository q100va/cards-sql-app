import { RolePermission } from '../../../models/index.js';
import { OPERATIONS } from '../../../shared/operations.js';

/**
 * Create a role permission record.
 */
export async function createOperation(overrides = {}) {
  const operation = {
    roleId: overrides.roleId,
    name: overrides.name,
    access: overrides.access ?? false,
    disabled: overrides.disabled ?? false,
  };

  if (!operation.roleId || !operation.name) {
    throw new Error('createOperation: roleId and name are required');
  }

  const row = await RolePermission.create(operation, { returning: true });
  return row.get({ plain: true });
}

/**
 * Seed the complete default permission set for a role.
 */
export async function seedDefaultOperationsForRole(roleId) {
  const rows = OPERATIONS.map((operation) => ({
    roleId,
    name: operation.operation,
    access: false,
    disabled: operation.flag === 'FULL',
  }));

  await RolePermission.bulkCreate(rows);
}

/**
 * Get all permissions assigned to a role.
 */
export async function getOperationsByRole(roleId) {
  return RolePermission.findAll({
    where: { roleId },
    attributes: ['id', 'roleId', 'name', 'access', 'disabled'],
    order: [['name', 'ASC']],
    raw: true,
  });
}

/**
 * Get a permission id by role and operation name.
 */
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
 * Update access or disabled state for a role permission.
 */
export async function setOperationAccess(roleId, name, { access, disabled }) {
  const [affected, updated] = await RolePermission.update(
    {
      ...(access !== undefined ? { access } : {}),
      ...(disabled !== undefined ? { disabled } : {}),
    },
    { where: { roleId, name }, individualHooks: true, returning: true },
  );

  return affected > 0 ? updated[0].get({ plain: true }) : null;
}

export async function grantOperationsForRole(roleId, operationNames) {
  const operations = [];
  for (const name of operationNames) {
    operations.push(await createOperation({ roleId, name, access: true, disabled: false }));
  }
  return operations;
}
