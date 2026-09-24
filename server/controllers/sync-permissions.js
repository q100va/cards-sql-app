import sequelize from '../database.js';
import { Role, RolePermission } from '../models/index.js';
import { OPERATIONS } from '../shared/operations.js';
import { applyAllOpsRule } from './apply-all-ops-rule.js';

// Cache all configured operation codes.
const ALL_CODES = new Set(
  OPERATIONS.map((operation) => operation.operation),
);

// Synchronize permissions for a single role.
export async function syncRolePermissionsFor(roleId) {
  await sequelize.transaction(
    async (transaction) => {
      // Prevent concurrent permission synchronization.
      await sequelize.query(
        'SELECT pg_advisory_xact_lock(42042)',
        { transaction },
      );

      const current =
        await RolePermission.findAll({
          where: { roleId },
          raw: true,
          transaction,
        });

      const currentMap = new Map(
        current.map((permission) => [
          permission.name,
          permission,
        ]),
      );

      // Add operations that are present in configuration but missing for the role.
      for (const operation of OPERATIONS) {
        if (!currentMap.has(operation.operation)) {
          await RolePermission.create(
            {
              roleId,
              name: operation.operation,
              access: false,
              disabled:
                operation.flag === 'FULL',
            },
            { transaction },
          );
        }
      }

      // Remove permissions for operations that no longer exist in configuration.
      for (const [code] of currentMap) {
        if (!ALL_CODES.has(code)) {
          await RolePermission.destroy({
            where: {
              roleId,
              name: code,
            },
            transaction,
          });
        }
      }

      // Normalize ALL_OPS and FULL/LIMITED dependencies.
      await applyAllOpsRule(
        roleId,
        transaction,
      );
    },
  );
}

// Synchronize permissions for all roles.
export async function syncAllRolesPermissions() {
  const roles = await Role.findAll({
    attributes: ['id'],
    raw: true,
  });

  for (const role of roles) {
    await syncRolePermissionsFor(role.id);
  }
}
