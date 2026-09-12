import { Router } from "express";
import { Op } from 'sequelize';

import { Role, RolePermission, User } from "../models/index.js";

import requireAuth from '../middlewares/check-auth.js';
import { validateRequest } from "../middlewares/validate-request.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';

import { withTransaction } from "../controllers/with-transaction.js";

import { OPERATIONS, OPERATION_FLAG } from "../shared/operations.js";
import CustomError from "../shared/customError.js";

import * as roleSchemas from "../../shared/dist/schemas/role.schema.js";


const router = Router();

router.get(
  "/check-role-name/:name",
  requireAuth,
  requireAny('ADD_NEW_ROLE', 'EDIT_ROLE'),
  validateRequest(roleSchemas.roleNameSchema, 'params'),
  async (req, res, next) => {
    try {
      const roleName = req.params.name;
      const duplicate = await Role.findOne({
        where: { name: { [Op.iLike]: roleName } },
        attributes: ["name"],
        raw: true,
      });

      const exists = duplicate !== null;

      res.status(200).send({
        data: exists,
        ...(exists && { code: 'ERRORS.ROLE.ALREADY_EXISTS' }),
      });

    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  }
);

router.post(
  "/create-role",
  requireAuth,
  requireOperation('ADD_NEW_ROLE'),
  validateRequest(roleSchemas.roleDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      const roleName = await withTransaction(async (t) => {

        const role = await Role.create({ name, description }, { transaction: t });

        // Seed all operations for the role
        const permissionRows = OPERATIONS.map((operation) => ({
          name: operation.operation,
          roleId: role.id,
          access: false,
          disabled: operation.flag === OPERATION_FLAG.FULL,
        }));
        await RolePermission.bulkCreate(permissionRows, { transaction: t });

        return role.name;
      });

      res.status(200).send({ code: 'SUCCESS.CREATED', data: roleName });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
      next(error);
    }
  }
);

router.patch(
  "/update-role",
  requireAuth,
  requireOperation('EDIT_ROLE'),
  validateRequest(roleSchemas.roleSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id, name, description } = req.body;

      const [, [updatedRole]] = await Role.update(
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

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: updatedRole });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  }
);

router.patch(
  "/update-role-access",
  requireAuth,
  requireOperation('EDIT_ROLE'),
  validateRequest(roleSchemas.roleChangeAccessSchema, 'body'),
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
                RolePermission.findOne({
                  attributes: ["id"],
                  where: { name: op.operation, roleId, access: false },
                  raw: true,
                  transaction: t,
                })
              )
            );
            const allHaveAccess = results.every(
              (permission) => permission === null,
            );
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
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  }
);

async function changeRoleOperation(
  roleId,
  operation,
  access,
  updatedOperationsMap,
  transaction,
) {
  const [, [updatedOperation]] =
    await RolePermission.update(
      { access },
      {
        where: {
          roleId,
          name: operation.operation,
        },
        individualHooks: true,
        returning: true,
        transaction,
      },
    );

  if (!updatedOperation) {
    throw new CustomError(
      'ERRORS.DATA_NOT_FOUND',
      404,
    );
  }

  updatedOperationsMap.set(
    updatedOperation.id,
    {
      id: updatedOperation.id,
      roleId: updatedOperation.roleId,
      access: updatedOperation.access,
      disabled: updatedOperation.disabled,
    },
  );

  // No complementary view exists without a flag.
  if (!operation.flag) return;

  const isLimited =
    operation.flag === OPERATION_FLAG.LIMITED;

  const fromView = isLimited
    ? 'VIEW_LIMITED'
    : 'VIEW_FULL';

  const toView = isLimited
    ? 'VIEW_FULL'
    : 'VIEW_LIMITED';

  const complementaryOperation =
    operation.operation.replace(
      fromView,
      toView,
    );

  const updateParams = {
    disabled: isLimited ? !access : access,
    ...(
      (!isLimited && access) ||
        (isLimited && !access)
        ? { access }
        : {}
    ),
  };

  const [, [updatedComplementaryOperation]] =
    await RolePermission.update(
      updateParams,
      {
        where: {
          roleId,
          name: complementaryOperation,
        },
        returning: true,
        individualHooks: true,
        transaction,
      },
    );

  if (!updatedComplementaryOperation) {
    throw new CustomError(
      'ERRORS.DATA_NOT_FOUND',
      404,
    );
  }

  updatedOperationsMap.set(
    updatedComplementaryOperation.id,
    {
      id: updatedComplementaryOperation.id,
      roleId: updatedComplementaryOperation.roleId,
      access: updatedComplementaryOperation.access,
      disabled: updatedComplementaryOperation.disabled,
    },
  );
}

router.get(
  "/get-roles-names-list",
  requireAuth,
  requireAny('ADD_NEW_USER', 'EDIT_USER', 'VIEW_LIMITED_USERS_LIST'),
  async (req, res, next) => {
    try {
      const roles = await Role.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
        raw: true,
      });
      res.status(200).send({ data: roles });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.get(
  "/get-roles",
  requireAuth,
  requireOperation('VIEW_LIMITED_ROLES_LIST'),
  async (req, res, next) => {
    try {
      const roles = await Role.findAll({
        attributes: ["id", "name", "description"],
        order: [["id", "ASC"]],
        raw: true,
      });

      const roleIds = roles.map(
        (role) => role.id,
      );
      const rolePermissions = await RolePermission.findAll({
        where: { roleId: roleIds },
        attributes: ["id", "roleId", "name", "access", "disabled"],
        raw: true,
      });

      // Index operations by "roleId_permissionName"
      const permissionMap = new Map();
      rolePermissions.forEach((permission) => {
        permissionMap.set(
          `${permission.roleId}_${permission.name}`,
          permission,
        );
      });

      // Start with a copy of all available operations
      const listOfOperations = OPERATIONS.map((op) => ({
        ...op,
        rolesAccesses: [],
      }));

      // Attach access entries for each role
      roles.forEach((role) => {
        listOfOperations.forEach((op) => {
          const key = `${role.id}_${op.operation}`;

          const permission =
            permissionMap.get(key);

          if (permission) {
            op.rolesAccesses.push({
              id: permission.id,
              roleId: permission.roleId,
              access: permission.access,
              disabled: permission.disabled,
            });
          }
        });
      });

      res
        .status(200)
        .send({ data: { operations: listOfOperations, roles } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.get(
  "/check-role-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_ROLE'),
  validateRequest(roleSchemas.roleIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const roleId = req.params.id;
      const connectedUsersAmount = await User.count({
        where: { roleId },
        raw: true,
      });

      const response = {
        data: connectedUsersAmount,
      };

      if (connectedUsersAmount > 0) {
        response.code = 'ROLE.HAS_DEPENDENCIES';
      }

      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  }
);

router.delete(
  '/delete-role/:id',
  requireAuth,
  requireOperation('DELETE_ROLE'),
  validateRequest(roleSchemas.roleIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const roleId = req.params.id;

      await withTransaction(async (t) => {
        const connectedUsersAmount = await User.count({
          where: { roleId },
          transaction: t,
        });

        if (connectedUsersAmount > 0) {
          throw new CustomError(
            'ERRORS.ROLE.HAS_DEPENDENCIES',
            409,
          );
        }

        const destroyed = await Role.destroy({
          where: { id: roleId },
          individualHooks: true,
          transaction: t,
        });

        if (destroyed === 0) {
          throw new CustomError(
            'ERRORS.DATA_NOT_FOUND',
            404,
          );
        }
      });

      res.status(200).send({
        code: 'SUCCESS.DELETED',
        data: null,
      });
    } catch (error) {
      error.code =
        error.code ?? 'ERRORS.DATA_DELETE_FAILED';

      next(error);
    }
  },
);

export default router;
