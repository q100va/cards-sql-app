import { Router } from "express";
import Sequelize from "sequelize";
import Role from "../models/role.js";
import User from "../models/user.js";
import Operation from "../models/operation.js";
import { OPERATIONS } from "../shared/operations.js";
import CustomError from "../shared/customError.js";
import { validateRequest } from "../middlewares/validate-request.js";
import * as roleSchemas from "../../shared/dist/role.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import requireAuth from '../middlewares/check-auth.js';


// TODO: add authentication/authorization middlewares
// import { authorizeAdmin } from "../middlewares/auth.js";

const Op = Sequelize.Op;
const router = Router();

/**
 * GET /check-role-name/:name
 * Check if a role with the given name already exists (case-insensitive).
 */
router.get(
  "/check-role-name/:name",
  validateRequest(roleSchemas.roleNameSchema, "params"),
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      const roleName = req.params.name.toLowerCase();
      const duplicate = await Role.findOne({
        where: { name: { [Op.iLike]: roleName } },
        attributes: ["name"],
        raw: true,
      });
      let response = {};
      response.data = duplicate !== null;
      if (duplicate !== null) response.code = 'ROLE.ALREADY_EXISTS';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = 'ERRORS.ROLE.NAME_NOT_CHECKED';
      next(error);
    }
  }
);

/**
 * POST /create-role
 * Create a new role and insert default operations for it.
 */
router.post(
  "/create-role",
  validateRequest(roleSchemas.roleDraftSchema),
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      const roleName = await withTransaction(async (t) => {
        // Create role
        const role = await Role.create({ name, description }, { transaction: t });

        // Seed all operations for the role
        const rows = OPERATIONS.map((operation) => ({
          name: operation.operation,
          roleId: role.id,
          access: false,
          disabled: operation.flag === "FULL",
        }));
        await Operation.bulkCreate(rows, { transaction: t });

        return role.name;
      });

      res.status(200).send({ code: 'ROLE.CREATED', data: roleName });
    } catch (error) {
      error.code = 'ERRORS.ROLE.NOT_CREATED';
      next(error);
    }
  }
);

/**
 * PATCH /update-role
 * Update role details (name, description).
 */
router.patch(
  "/update-role",
  validateRequest(roleSchemas.roleSchema),
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      const { id, name, description } = req.body;

      const [_, [updatedRole]] = await Role.update(
        { name, description },
        {
          where: { id },
          individualHooks: true,
          returning: ["id", "name", "description"],
        }
      );

      if (!updatedRole) {
        throw new CustomError('ERRORS.ROLE.NOT_FOUND', 404);
      }

      res.status(200).send({ code: 'ROLE.UPDATED', data: updatedRole });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ROLE.NOT_UPDATED';
      next(error);
    }
  }
);

/**
 * PATCH /update-role-access
 * Toggle access for a role's operation.
 * If needed, also toggle the corresponding "full access" operation and complementary views.
 */
router.patch(
  "/update-role-access",
  validateRequest(roleSchemas.roleChangeAccessSchema),
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      const { access, roleId, operation } = req.body;

      const updatedOperationsMap = await withTransaction(async (t) => {
        const opsMap = new Map();

        // Update the requested operation
        await changeRoleOperation(roleId, operation, access, opsMap, t);

        // Find related ops for the same object and the "super" (ALL_OPS) op
        const relatedOps = OPERATIONS.filter(
          (item) => item.object === operation.object && !item.accessToAllOps
        );
        const superAccessOperation = OPERATIONS.find(
          (item) => item.object === operation.object && item.accessToAllOps
        );

        if (operation.accessToAllOps) {
          // When toggling ALL_OPS, mirror the change to all related ops
          await Promise.all(
            relatedOps.map((op) =>
              changeRoleOperation(roleId, op, access, opsMap, t)
            )
          );
        } else {
          if (!access) {
            // Turning off any op should also turn off ALL_OPS
            if (superAccessOperation) {
              await changeRoleOperation(roleId, superAccessOperation, access, opsMap, t);
            }
          } else {
            // If all related ops are enabled, enable ALL_OPS
            const results = await Promise.all(
              relatedOps.map((op) =>
                Operation.findOne({
                  attributes: ["id"],
                  where: { name: op.operation, roleId, access: false },
                  raw: true,
                  transaction: t,
                })
              )
            );
            const allHaveAccess = results.every((r) => r === null);
            if (allHaveAccess && superAccessOperation) {
              await changeRoleOperation(roleId, superAccessOperation, true, opsMap, t);
            }
          }
        }

        return opsMap;
      });

      const updatedOperations = Array.from(updatedOperationsMap.values());
      res
        .status(200)
        .send({
          data: { ops: updatedOperations, object: operation.object },
        });
    } catch (error) {
      error.code = 'ERRORS.ROLE.NOT_UPDATED';
      next(error);
    }
  }
);

/**
 * Helper: update a role's operation and its complementary VIEW_* pair when applicable.
 *
 * @param roleId - role id
 * @param operation - operation meta from OPERATIONS
 * @param access - desired access value
 * @param updatedOperationsMap - accumulator to return updated rows to client
 * @param transaction - sequelize transaction
 */
async function changeRoleOperation(
  roleId,
  operation,
  access,
  updatedOperationsMap,
  transaction
) {
  // Update main operation
  const [_, [updatedOperation]] = await Operation.update(
    { access },
    {
      where: { roleId, name: operation.operation },
      individualHooks: true,
      returning: true,
      transaction,
    }
  );
  updatedOperationsMap.set(updatedOperation.id, {
    id: updatedOperation.id,
    roleId: updatedOperation.roleId,
    access: updatedOperation.access,
    disabled: updatedOperation.disabled,
  });

  // No complementary view if flag is absent
  if (!operation.flag) return;

  // Compute complementary VIEW_* op name
  const isLimited = operation.flag === "LIMITED";
  const fromView = isLimited ? "VIEW_LIMITED" : "VIEW_FULL";
  const toView = isLimited ? "VIEW_FULL" : "VIEW_LIMITED";
  const complementaryOperation = operation.operation.replace(fromView, toView);

  // Determine how to update the complementary op:
  // - LIMITED toggles disabled = !access; FULL toggles disabled = access
  // - access value is synced when enabling FULL or disabling LIMITED
  const updateParams = {
    disabled: isLimited ? !access : access,
    ...((!isLimited && access) || (isLimited && !access) ? { access } : {}),
  };

  const [__, [updatedOperationWithFlag]] = await Operation.update(
    updateParams,
    {
      where: { roleId, name: complementaryOperation },
      returning: true,
      individualHooks: true,
      transaction,
    }
  );
  updatedOperationsMap.set(updatedOperationWithFlag.id, {
    id: updatedOperationWithFlag.id,
    roleId: updatedOperationWithFlag.roleId,
    access: updatedOperationWithFlag.access,
    disabled: updatedOperationWithFlag.disabled,
  });
}

/**
 * GET /get-roles-names-list
 * Return all roles as { id, name } sorted by name.
 */
router.get(
  "/get-roles-names-list",
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      const roles = await Role.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
        raw: true,
      });
      res.status(200).send({ data: roles });
    } catch (error) {
      error.code = 'ERRORS.ROLE.NAME_LIST_FAILED';
      next(error);
    }
  }
);

/**
 * GET /get-roles
 * Return roles and their operations with access/disabled flags.
 */
router.get(
  "/get-roles",
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      // Roles
      const roles = await Role.findAll({
        attributes: ["id", "name", "description"],
        order: [["id", "ASC"]],
        raw: true,
      });

      // Operations per role
      const rolesIds = roles.map((r) => r.id);
      const rolesOps = await Operation.findAll({
        where: { roleId: rolesIds },
        attributes: ["id", "roleId", "name", "access", "disabled"],
        raw: true,
      });

      // Index operations by "roleId_opName"
      const opMap = new Map();
      rolesOps.forEach((op) => opMap.set(`${op.roleId}_${op.name}`, op));

      // Start with a copy of all available operations
      const listOfOperations = OPERATIONS.map((op) => ({
        ...op,
        rolesAccesses: [],
      }));

      // Attach access entries for each role
      roles.forEach((role) => {
        listOfOperations.forEach((op) => {
          const key = `${role.id}_${op.operation}`;
          if (opMap.has(key)) {
            const found = opMap.get(key);
            op.rolesAccesses.push({
              id: found.id,
              roleId: found.roleId,
              access: found.access,
              disabled: found.disabled,
            });
          }
        });
      });

      res
        .status(200)
        .send({ data: { operations: listOfOperations, roles } });
    } catch (error) {
      error.code = 'ERRORS.ROLE.LIST_FAILED';
      next(error);
    }
  }
);

/**
 * GET /check-role-before-delete/:id
 * Check whether a role can be deleted (returns assigned usernames if any).
 */
router.get(
  "/check-role-before-delete/:id",
  validateRequest(roleSchemas.roleIdSchema, "params"),
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      const roleId = req.params.id;
      const connectedUsersAmount = await User.count({
        where: { roleId },
        raw: true,
      });

      let response = { data: connectedUsersAmount };
      if (connectedUsersAmount > 0) response.code = 'ROLE.HAS_DEPENDENCIES';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = 'ERRORS.ROLE.NOT_CHECKED';
      next(error);
    }
  }
);

/**
 * DELETE /delete-role/:id
 * Delete a role by id.
 */

router.delete(
  "/delete-role/:id",
  validateRequest(roleSchemas.roleIdSchema, "params"),
  requireAuth,
  // authorizeAdmin,
  async (req, res, next) => {
    try {
      const roleId = req.params.id;
      await withTransaction(async (t) => {
        const destroyed = await Role.destroy({
          where: { id: roleId },
          individualHooks: true,
          transaction: t,
        });
        if (destroyed === 0) {
          throw new CustomError('ERRORS.ROLE.NOT_FOUND', 404);
        }
      });

      res.status(200).send({ code: 'ROLE.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ROLE.NOT_DELETED';
      next(error);
    }
  }
);

export default router;
