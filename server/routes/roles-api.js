import { Router } from "express";
import Sequelize from "sequelize";
import Role from "../models/role.js";
import User from "../models/user.js";
import Operation from "../models/operation.js";
import { OPERATIONS } from "../shared/operations.js";
import CustomError from "../shared/customError.js";
import sanitizeBody from "../middlewares/sanitize-body.js";
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
 * POST /check-role-name
 * Checks if a role with the provided name already exists in the database.
 */
router.post(
  "/check-role-name",
  sanitizeBody({
    roleName: { type: 'string', maxLength: 50, allowEmpty: false, allowNull: false, required: true },
  }),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      // Convert role name to lower case to ensure case-insensitive matching.
      const roleName = req.body.roleName.toLowerCase();
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

const newRoleSchema = {
  name: { type: 'string', maxLength: 50, allowEmpty: false, allowNull: false, required: true },
  description: { type: 'string', maxLength: 500, allowEmpty: false, allowNull: false, required: true }
};

router.post(
  "/create-role",
  sanitizeBody(newRoleSchema),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      // Expect request data to have "name" and "description" properties.
      const { name, description } = req.body;
      // Create the role record.
      const role = await Role.create({
        name,
        description,
      });
      // Create all associated operation records in parallel.
      const opPromises = OPERATIONS.map((operation) =>
        Operation.create({
          name: operation.operation,
          roleId: role.id,
          access: false,
          disabled: operation.flag === "FULL",
        })
      );
      await Promise.all(opPromises);
      res
        .status(200)
        .send({ msg: "Роль успешно создана.", data: role.name});
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

const updatingRoleSchema = {
  id: { type: 'number', allowEmpty: false, allowNull: false, required: true },
  name: { type: 'string', maxLength: 50, allowEmpty: false, allowNull: false, required: true },
  description: { type: 'string', maxLength: 500, allowEmpty: false, allowNull: false, required: true }
};

router.patch(
  "/update-role",
  sanitizeBody(updatingRoleSchema),
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
          returning: true
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

const roleAccessSchema = {
  access: { type: 'boolean', allowEmpty: false, allowNull: false, required: true },
  roleId: { type: 'number', allowEmpty: false, allowNull: false, required: true },
  operation: {
    type: 'object', allowEmpty: false, allowNull: false, required: true,
    schema: {
      fullAccess: { type: 'boolean', allowEmpty: false, allowNull: false, required: true },
      object: { type: 'string', allowEmpty: false, allowNull: false, required: true },
      operation: { type: 'string', allowEmpty: false, allowNull: false, required: true },
      flag: { type: 'string', enumValues: ['LIMITED', 'FULL'], allowEmpty: false, allowNull: true }
    }
  }
};

router.patch(
  "/update-role-access",
  sanitizeBody(roleAccessSchema),
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const { access, roleId, operation } = req.body;
      const updatedOperationsMap = new Map();
      // Update the main operation entry.
      await changeRoleOperation(roleId, operation, access, updatedOperationsMap);
      // Filter operations related to the same object but excluding full access.
      const filteredList = OPERATIONS.filter(
        (item) => item.object === operation.object && !item.fullAccess
      );
      // Find the corresponding full access operation for the same object.
      const fullAccessOperation = OPERATIONS.find(
        (item) => item.object === operation.object && item.fullAccess
      );
      // If the operation itself has full access enabled.
      if (operation.fullAccess) {
        await Promise.all(
          filteredList.map((op) => changeRoleOperation(roleId, op, access, updatedOperationsMap))
        );
      } else {
        // If disabling access, update the full access operation.
        if (!access) {
          await changeRoleOperation(roleId, fullAccessOperation, access, updatedOperationsMap);
        } else {
          // Check if all other related operations have access enabled.
          const checkPromises = filteredList.map((op) =>
            Operation.findOne({
              attributes: ["id"],
              where: { name: op.operation, roleId, access: false },
              raw: true,
            })
          );
          const results = await Promise.all(checkPromises);
          const allHaveAccess = results.every((result) => result === null);
          if (allHaveAccess) {
            await changeRoleOperation(roleId, fullAccessOperation, true, updatedOperationsMap);
          }
        }
      }
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
async function changeRoleOperation(roleId, operation, access, updatedOperationsMap) {
  // Update the main operation record
  const [_, [updatedOperation]] = await Operation.update(
    { access },
    {
      where: { roleId, name: operation.operation },
      returning: true,
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
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const roleId = req.params.id;
      if (!roleId) {
        throw new CustomError("Отсутствует id роли.", 400);
      }
      const idNum = Number(roleId);
      if (isNaN(idNum) || idNum <= 0) {
        throw new CustomError("Некорректное значение id.", 400);
      }
      // Find any users currently assigned this role.
      let connectedUsers = await User.findAll({
        where: { roleId },
        attributes: ["userName"],
        raw: true,
      });
      const connectedUsersList = connectedUsers.map(item => item.userName).join(', ');
      res
        .status(200)
        .send({ msg: "Role deletion possibility checked.", data: connectedUsersList.length > 0 ? connectedUsersList : null });
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
  //authenticateUser,
  //authorizeAdmin,
  async (req, res) => {
    try {
      const roleId = req.params.id;
      //const roleId = null;
      if (!roleId) {
        throw new CustomError("Отсутствует id роли.", 400);
      }
      const idNum = Number(roleId);
      if (isNaN(idNum) || idNum <= 0) {
        throw new CustomError("Некорректное значение id.", 400);
      }
      const destroyedRole = await Role.destroy({ where: { id: roleId } });
      if (destroyedRole === 0) {
        throw new CustomError("Роль не найдена.", 404);
      }
      res.status(200).send({ msg: "Role deleted.", deleted: true });
    } catch (error) {
      handleError(error, res, "Произошла ошибка при удалении роли.");
    }
  }
);
export default router;
