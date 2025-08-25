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
// TODO: Middleware for authentication and admin authorization.
//import { authenticateUser, authorizeAdmin } from "../middlewares/auth.js";
const Op = Sequelize.Op;
const router = Router();

/**
 * Logs the error details and sends a generic response to the client.
 *
 * @param {Error} error - The error object that was caught.
 * @param {Response} res - The Express response object.
 * @param {string} genericMessage - A generic error message to send to the client.
 */
const handleError = (error, res, genericMessage) => {
  console.error(error); // TODO: Ideally use a logging library in production.
  res.status(error.statusCode || 500).send(error.customError ? error.message : genericMessage);
};

/**
 * GET /check-role-name
 * Checks if a role with the provided name already exists in the database.
 */
router.get(
  "/check-role-name/:name",
  validateRequest(roleSchemas.roleNameSchema, 'params'),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      // Convert role name to lower case to ensure case-insensitive matching.
      const roleName = req.params.name.toLowerCase();
      // Query the database for any existing role with the same name (case-insensitive).
      const duplicate = await Role.findOne({
        where: { name: { [Op.iLike]: roleName } },
        attributes: ["name"],
        raw: true,
      });
      res.status(200).send({ msg: "Проверка завершена.", data: duplicate !== null });
    } catch (error) {
      handleError(error, res, "Произошла ошибка при проверке названия роли.");
    }
  });

/**
 * POST /create-role
 * Creates a new role and all its associated operations.
 * Access: Admin only.
 */

router.post(
  "/create-role",
  validateRequest(roleSchemas.roleDraftSchema),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      // Expect request data to have "name" and "description" properties.
      const { name, description } = req.body;
      // Create the role record.
      const roleName = await withTransaction(async (t) => {
        const role = await Role.create({
          name,
          description,
        },
          { transaction: t });
        // Create all associated operation records in parallel.
        const rows = OPERATIONS.map((operation) => ({
          name: operation.operation,
          roleId: role.id,
          access: false,
          disabled: operation.flag === "FULL",

        }));
        await Operation.bulkCreate(rows, { transaction: t });
        return role.name;
      });

      res
        .status(200)
        .send({ msg: "Роль успешно создана.", data: roleName });
    } catch (error) {
      handleError(error, res, "Произошла ошибка. Роль не создана.");
    }
  }
);

/**
 * PATCH /update-role
 * Updates the details (name and description) of an existing role.
 * Access: Admin only.
 */
router.patch(
  "/update-role",
  validateRequest(roleSchemas.roleSchema),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const { id, name, description } = req.body;
      // Update the role record.
      const [_, [updatedRole]] = await Role.update(
        {
          name,
          description,
        },
        {
          where: { id },
          returning: ['id', 'name', 'description'],
        }
      );
      if (!updatedRole) {
        throw new CustomError("Обновление невозможно. Роль не найдена.", 404);
      }
      res.status(200).send({ msg: "Роль успешно обновлена.", data: updatedRole });
    } catch (error) {
      handleError(error, res, "Произошла ошибка. Роль не обновлена.");
    }
  }
);

/**
 * PATCH /update-role-access
 * Updates the access property of a role's operation. Also toggles 'full access'
 * or related operations based on the provided flag.
 * Access: Admin only.
 */
router.patch(
  "/update-role-access",
  validateRequest(roleSchemas.roleChangeAccessSchema),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const { access, roleId, operation } = req.body;
      let updatedOperationsMap = new Map();
      updatedOperationsMap = await withTransaction(async (t) => {
        // Update the main operation entry.
        await changeRoleOperation(roleId, operation, access, updatedOperationsMap, t);
        // Filter operations related to the same object but excluding full access.
        const relatedOps = OPERATIONS.filter(
          (item) => item.object === operation.object && !item.accessToAllOps
        );
        // Find the corresponding full access operation for the same object.
        const superAccessOperation = OPERATIONS.find(
          (item) => item.object === operation.object && item.accessToAllOps
        );
        // If the operation itself has full access enabled.
        if (operation.accessToAllOps) {
          await Promise.all(
            relatedOps.map((op) =>
              changeRoleOperation(roleId, op, access, updatedOperationsMap, t)
            )
          );
        } else {
          // If disabling access, update the full access operation.
          if (!access) {
            if (superAccessOperation) {
              await changeRoleOperation(roleId, superAccessOperation, access, updatedOperationsMap, t);
            }
          } else {
            // Check if all other related operations have access enabled.
            const results = await Promise.all(
              relatedOps.map((op) =>
                Operation.findOne({
                  attributes: ["id"],
                  where: { name: op.operation, roleId, access: false },
                  raw: true,
                  transaction: t
                })
              )
            );

            const allHaveAccess = results.every((result) => result === null);
            if (allHaveAccess && superAccessOperation) {
              await changeRoleOperation(roleId, superAccessOperation, true, updatedOperationsMap, t);
            }
          }
        }

        return updatedOperationsMap;
      });
      const updatedOperations = Array.from(updatedOperationsMap.values());
      res.status(200).send({ msg: "Роль успешно обновлена.", data: { ops: updatedOperations, object: operation.object } });
    } catch (error) {
      handleError(error, res, "Произошла ошибка (роль не обновлена).");
    }
  }
);

/**
 * Helper function to update the operation record associated with a role.
 *
 * @param {number} roleId - The ID of the role.
 * @param {object} operation - The operation details object.
 * @param {boolean} access - Desired access state.
 */
async function changeRoleOperation(roleId, operation, access, updatedOperationsMap, transaction) {
  // Update the main operation record
  const [_, [updatedOperation]] = await Operation.update(
    { access },
    {
      where: { roleId, name: operation.operation },
      returning: true,
      transaction
    },
  );
  updatedOperationsMap.set(updatedOperation.id, {
    id: updatedOperation.id,
    roleId: updatedOperation.roleId,
    access: updatedOperation.access,
    disabled: updatedOperation.disabled,
  });
  // Only process if operation has a flag
  if (!operation.flag) {
    return;
  }
  // Get complementary view type and operation name
  const isLimited = operation.flag === 'LIMITED';
  const fromView = isLimited ? 'VIEW_LIMITED' : 'VIEW_FULL';
  const toView = isLimited ? 'VIEW_FULL' : 'VIEW_LIMITED';
  const complementaryOperation = operation.operation.replace(fromView, toView);
  // Determine update parameters based on operation type and access
  let updateParams = {
    disabled: isLimited ? !access : access,
  }
  if ((!isLimited && access) || (isLimited && !access)) {
    updateParams.access = access;
  }
  // Update the complementary operation
  const [__, [updatedOperationWithFlag]] = await Operation.update(
    updateParams,
    {
      where: {
        roleId,
        name: complementaryOperation
      },
      returning: true,
      transaction
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
 * Retrieves a list of roles (id and name) sorted by name.
 * Access: Admin only.
 */
router.get(
  "/get-roles-names-list",
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const roles = await Role.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
        raw: true,
      });
      res
        .status(200)
        .send({ msg: "Data retrieved.", data: roles });
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
 * Retrieves detailed information for all roles including their associated operations.
 * Access: Admin only.
 */
router.get(
  "/get-roles",
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      //throw error;
      //Fetch roles with id, name and description.
      const roles = await Role.findAll({
        attributes: ["id", "name", "description"],
        order: [["id", "ASC"]],
        raw: true,
      });
      // Retrieve operations associated with the roles.
      const rolesIds = roles.map((role) => role.id);
      const rolesOps = await Operation.findAll({
        where: { roleId: rolesIds },
        attributes: ["id", "roleId", "name", "access", "disabled"],
        raw: true,
      });

      // Create a map with key "roleId_operationName" to quickly lookup operations.
      const opMap = new Map();
      rolesOps.forEach((op) => {
        opMap.set(`${op.roleId}_${op.name}`, op);
      });
      // Clone operations array and add an empty roles list for each operation.
      const listOfOperations = OPERATIONS.map((op) => ({ ...op, rolesAccesses: [] }));
      // For each role, attach corresponding operation details.
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
      res.status(200).send({
        msg: "Data retrieved.",
        data: { operations: listOfOperations, roles },
      });
    } catch (error) {
      handleError(error, res, "Произошла ошибка при получении списка ролей.");
    }
  }
);

/**
 * GET /check-role-before-delete/:id
 * Checks if a role can be deleted by ensuring no users are associated with it.
 * Access: Admin only.
 */
router.get(
  "/check-role-before-delete/:id",
  validateRequest(roleSchemas.roleIdSchema, 'params'),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const roleId = req.params.id;
      // Find any users currently assigned this role.
      let connectedUsers = await User.findAll({
        where: { roleId },
        attributes: ["userName"],
        raw: true,
      });
      const connectedUsersList = connectedUsers.map(item => item.userName).join(', ');
      res
        .status(200)
        .send({ msg: "Role deletion possibility checked.", data: connectedUsersList });
    } catch (error) {
      handleError(error, res, "Произошла ошибка при проверке возможности удаления роли.");
    }
  }
);

/**
 * DELETE /delete-role/:id
 * Deletes a role by its id.
 * Access: Admin only.
 */
router.delete(
  "/delete-role/:id",
  validateRequest(roleSchemas.roleIdSchema, 'params'),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const roleId = req.params.id;
      const destroyedRole = await Role.destroy({ where: { id: roleId } });
      if (destroyedRole === 0) {
        throw new CustomError("Роль не найдена.", 404);
      }
      res.status(200).send({ msg: "Role deleted.", data: true });
    } catch (error) {
      handleError(error, res, "Произошла ошибка при удалении роли.");
    }
  }
);
export default router;
