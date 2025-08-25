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
import handleError from "../controllers/error-handler.js";

// TODO: add authentication/authorization middlewares
// import { authenticateUser, authorizeAdmin } from "../middlewares/auth.js";

const Op = Sequelize.Op;
const router = Router();

/**
 * GET /check-role-name/:name
 * Check if a role with the given name already exists (case-insensitive).
 */
router.get(
  "/check-role-name/:name",
  validateRequest(roleSchemas.roleNameSchema, "params"),
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
    try {
      const roleName = req.params.name.toLowerCase();
      const duplicate = await Role.findOne({
        where: { name: { [Op.iLike]: roleName } },
        attributes: ["name"],
        raw: true,
      });
      res
        .status(200)
        .send({ msg: "Проверка завершена.", data: duplicate !== null });
    } catch (error) {
      handleError(error, req, res, "Произошла ошибка при проверке названия роли.");
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
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
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

      res.status(200).send({ msg: "Роль успешно создана.", data: roleName });
    } catch (error) {
      handleError(error, req, res, "Произошла ошибка. Роль не создана.");
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
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
    try {
      const { id, name, description } = req.body;

      const [_, [updatedRole]] = await Role.update(
        { name, description },
        {
          where: { id },
          returning: ["id", "name", "description"],
        }
      );

      if (!updatedRole) {
        throw new CustomError("Обновление невозможно. Роль не найдена.", 404);
      }

      res.status(200).send({ msg: "Роль успешно обновлена.", data: updatedRole });
    } catch (error) {
      handleError(error, req, res, "Произошла ошибка. Роль не обновлена.");
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
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
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
          msg: "Роль успешно обновлена.",
          data: { ops: updatedOperations, object: operation.object },
        });
    } catch (error) {
      handleError(error, req, res, "Произошла ошибка (роль не обновлена).");
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
    ...( (!isLimited && access) || (isLimited && !access) ? { access } : {} ),
  };

  const [__, [updatedOperationWithFlag]] = await Operation.update(
    updateParams,
    {
      where: { roleId, name: complementaryOperation },
      returning: true,
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
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
    try {
      const roles = await Role.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
        raw: true,
      });
      res.status(200).send({ msg: "Data retrieved.", data: roles });
    } catch (error) {
      handleError(
        error,
        res,
        "Произошла ошибка при получении списка названий ролей."
      );
    }
  }
);

/**
 * GET /get-roles
 * Return roles and their operations with access/disabled flags.
 */
router.get(
  "/get-roles",
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
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
        .send({ msg: "Data retrieved.", data: { operations: listOfOperations, roles } });
    } catch (error) {
      handleError(error, req, res, "Произошла ошибка при получении списка ролей.");
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
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
    try {
      const roleId = req.params.id;
      const connectedUsers = await User.findAll({
        where: { roleId },
        attributes: ["userName"],
        raw: true,
      });
      const list = connectedUsers.map((u) => u.userName).join(", ");
      res
        .status(200)
        .send({ msg: "Role deletion possibility checked.", data: list });
    } catch (error) {
      handleError(
        error,
        res,
        "Произошла ошибка при проверке возможности удаления роли."
      );
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
  // authenticateUser,
  // authorizeAdmin,
  async (req, res) => {
    try {
      const roleId = req.params.id;
      const destroyed = await Role.destroy({ where: { id: roleId } });

      if (destroyed === 0) {
        throw new CustomError("Роль не найдена.", 404);
      }

      res.status(200).send({ msg: "Role deleted.", data: true });
    } catch (error) {
      handleError(error, req, res, "Произошла ошибка при удалении роли.");
    }
  }
);

export default router;
