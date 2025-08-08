import { Router } from "express";
import Sequelize from "sequelize";
import Role from "../models/role.js";
import User from "../models/user.js";
import Operation from "../models/operation.js";
import { OPERATIONS } from "../shared/operations.js";
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
  res.status(error.statusCode || 500).send(genericMessage);
};
/**
 * Middleware to validate that the request body contains a "data" property.
 */
const validateRoleData = (req, res, next) => {
  if (!req.body.data) {
    return res.status(400).send({ msg: "Missing data in request body." });
  }
  next();
};

/**
 * POST /check-role-name
 * Checks if a role with the provided name already exists in the database.
 */
router.post("/check-role-name", validateRoleData, async (req, res) => {
  try {
    // Validate that the data provided is a string (role name).
    if (typeof req.body.data !== "string") {
      return res.status(400).send({ msg: "Неверное название роли." });
    }
    // Sanitize and convert role name to lower case to ensure case-insensitive matching.
    const roleName = req.body.data.trim().toLowerCase();
    // Query the database for any existing role with the same name (case-insensitive).
    const duplicate = await Role.findOne({
      where: { name: { [Op.iLike]: roleName } },
      attributes: ["name"],
      raw: true,
    });
    res.status(200).send({ msg: "Проверка завершена.", data: duplicate });
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
  //authenticateUser,
  //authorizeAdmin,
  validateRoleData,
  async (req, res) => {
    try {
      // Expect request data to have "name" and "description" properties.
      const { name, description } = req.body.data;
      if (
        !name ||
        typeof name !== "string" ||
        !description ||
        typeof description !== "string"
      ) {
        return res
          .status(400)
          .send({ msg: "Отсутствующие или недействительные данные о роли." });
      }
      // Trim input to remove unnecessary whitespace.
      const sanitizedName = name.trim();
      const sanitizedDescription = description.trim();
      // Create the role record.
      const role = await Role.create({
        name: sanitizedName,
        description: sanitizedDescription,
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
        .send({ msg: "Роль успешно создана.", data: sanitizedName });
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
  //authenticateUser,
  //authorizeAdmin,
  validateRoleData,
  async (req, res) => {
    try {
      const { role } = req.body.data;
      // Validate that the role object contains an id, name, and description.
      if (
        !role ||
        !role.id ||
        !role.name ||
        typeof role.name !== "string" ||
        !role.description ||
        typeof role.description !== "string"
      ) {
        return res
          .status(400)
          .send({ msg: "Отсутствующие или недействительные данные о роли." });
      }
      // Update the role record with trimmed name and description.
      await Role.update(
        {
          name: role.name.trim(),
          description: role.description.trim(),
        },
        {
          where: { id: role.id },
        }
      );
      res.status(200).send({ msg: "Роль успешно обновлена.", data: true });
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
  //authenticateUser,
  //authorizeAdmin,
  validateRoleData,
  async (req, res) => {
    try {
      const { access, roleId, operation } = req.body.data;
      // Validate input data types and required fields.
      if (
        typeof access !== "boolean" ||
        !roleId ||
        !operation ||
        !operation.operation
      ) {
        return res.status(400).send({ msg: "Неверные данные запроса." });
      }
      // Update the main operation entry.
      await changeRoleOperation(roleId, operation, access);
      // Create a shallow copy of operations and add an empty roles list.
      const listOfOperations = OPERATIONS.map((op) => ({ ...op, roles: [] }));
      // Filter operations related to the same object but excluding full access.
      const filteredList = listOfOperations.filter(
        (item) => item.object === operation.object && !item.fullAccess
      );
      // Find the corresponding full access operation for the same object.
      const fullAccessOperation = listOfOperations.find(
        (item) => item.object === operation.object && item.fullAccess
      );
      // If the operation itself has full access enabled.
      if (operation.fullAccess) {
        await Promise.all(
          filteredList.map((op) => changeRoleOperation(roleId, op, access))
        );
      } else {
        // If disabling access, update the full access operation.
        if (!access) {
          await changeRoleOperation(roleId, fullAccessOperation, access);
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
            await changeRoleOperation(roleId, fullAccessOperation, true);
          }
        }
      }
      res.status(200).send({ msg: "Роль успешно обновлена.", data: true });
    } catch (error) {
      handleError(error, res, "Произошла ошибка (роль не обновлена).");
    }
  }
);
/**
 * Helper function to update the operation record associated with a role.
 *
 * @param {number|string} roleId - The ID of the role.
 * @param {object} operation - The operation details object.
 * @param {boolean} access - Desired access state.
 */
async function changeRoleOperation(roleId, operation, access) {
  // Update the main operation record
  await Operation.update(
    { access },
    {
      where: { roleId, name: operation.operation },
    }
  );
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
  await Operation.update(
    updateParams,
    {
      where: {
        roleId: roleId,
        name: complementaryOperation
      }
    }
  );

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
        .send({ msg: "Data retrieved.", data: { roles } });
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
      const roleIds = roles.map((role) => role.id);
      const roleOps = await Operation.findAll({
        where: { roleId: roleIds },
        attributes: ["id", "roleId", "name", "access", "disabled"],
        raw: true,
      });
      // Create a map with key "roleId_operationName" to quickly lookup operations.
      const opMap = new Map();
      roleOps.forEach((op) => {
        opMap.set(`${op.roleId}_${op.name}`, op);
      });
      // Clone operations array and add an empty roles list for each operation.
      const listOfOperations = OPERATIONS.map((op) => ({ ...op, rolesAccesses: [] }));
      // For each role, attach corresponding operation details.
      let roleOperationId = 1;
      roles.forEach((role) => {
        listOfOperations.forEach((op) => {
          const key = `${role.id}_${op.operation}`;
          if (opMap.has(key)) {
            const found = opMap.get(key);
            op.rolesAccesses.push({
              id: roleOperationId++,
              roleId: role.id,
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
        return res.status(400).send({ msg: "Отсутствует id роли." });
      }
      // Find any users currently assigned this role.
      const connectedUsers = await User.findAll({
        where: { roleId },
        attributes: ["id"],
        raw: true,
      });
      const possibility = connectedUsers.length === 0;
      res
        .status(200)
        .send({ msg: "Role deletion possibility checked.", data: possibility });
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
        return res.status(400).send("Отсутствует id роли.");
      }
      await Role.destroy({ where: { id: roleId } });
      res.status(200).send({ msg: "Role deleted.", data: true });
    } catch (error) {
      handleError(error, res, "Произошла ошибка при удалении роли.");
    }
  }
);
export default router;
