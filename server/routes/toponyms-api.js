import { Router } from "express";
import { Op } from 'sequelize';

import requireAuth from "../middlewares/check-auth.js";
import { validateRequest } from "../middlewares/validate-request.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';

import { withTransaction } from "../controllers/with-transaction.js";
import CustomError from "../shared/customError.js";

import * as toponymSchemas from "../../shared/dist/schemas/toponym.schema.js";

import {
  findDuplicate,
  countToponymDependencies,
  postProcessor,
  getToponymById,
  MAP,
  MAPS,
  MAP_POPULATE,
  markAddressesUnrecoverable,
} from "../controllers/ctrl-toponyms.js";

import sequelize from "../database.js";

const router = Router();

// Utility to copy whitelisted keys without mutating the source object.
function pick(obj, keys) {
  const out = {};
  if (!obj) return out;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) {
      out[k] = obj[k];
    }
  }
  return out;
}

function requireToponymDeletePermission(req, res, next) {
  const operation = req.query.destroy
    ? 'DELETE_TOPONYM'
    : 'BLOCK_TOPONYM';

  return requireOperation(operation)(req, res, next);
}

router.get(
  "/check-toponym-name",
  requireAuth,
  requireAny('ADD_NEW_TOPONYM', 'EDIT_TOPONYM'),
  validateRequest(toponymSchemas.checkToponymNameSchema, "query"),
  async (req, res, next) => {
    try {
      const query = req.query;
      const duplicateCount = await findDuplicate(query);
      const response = {
        data: duplicateCount !== 0,
        ...(duplicateCount && { code: 'ERRORS.TOPONYM.ALREADY_EXISTS' }),
      };

      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  }
);

router.post(
  '/create-toponym',
  requireAuth,
  requireOperation('ADD_NEW_TOPONYM'),
  validateRequest(toponymSchemas.toponymCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = req.body;
      const config = MAP[data.type];

      await findDuplicate(data);

      if (duplicateCount > 0) {
        throw new CustomError('ERRORS.TOPONYM.ALREADY_EXISTS', 409);
      }

      const payload = pick(data, config.payloadFields);
      const created = await config.Model.create(payload);
      const toponym = await getToponymById(created.id, data.type);

      res.status(201).json({ code: 'SUCCESS.CREATED', data: toponym });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
      next(error);
    }
  }
);

router.post(
  "/update-toponym",
  requireAuth,
  requireOperation('EDIT_TOPONYM'),
  validateRequest(toponymSchemas.toponymUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = req.body;
      const config = MAP[data.type];

      const duplicateCount = await findDuplicate(data);

      if (duplicateCount > 0) {
        throw new CustomError('ERRORS.TOPONYM.ALREADY_EXISTS', 409);
      }

      const payload = pick(data, config.payloadFields);
      const [updatedCount] = await config.Model.update(payload, {
        where: {
          id: data.id
        },
        individualHooks: true
      });
      if (updatedCount === 0) {
        throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      }
      const toponym = await getToponymById(data.id, data.type);
      res.status(200).json({ code: 'SUCCESS.UPDATED', data: toponym });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  }
);

router.get(
  "/get-:type-by-id/:id",
  requireAuth,
  requireAny('EDIT_TOPONYM', 'VIEW_TOPONYM'),
  validateRequest(toponymSchemas.findToponymByIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, id } = req.params;
      const toponym = await getToponymById(id, type);
      res.status(200).json({ data: toponym });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.get(
  "/get-toponyms-list",
  requireAuth,
  requireAny(
    'ADD_NEW_TOPONYM', 'EDIT_TOPONYM', 'VIEW_TOPONYM', 'VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST',
    'ADD_NEW_USER', 'EDIT_USER', 'VIEW_USER', 'VIEW_LIMITED_USERS_LIST', 'VIEW_FULL_USERS_LIST',
    'ADD_NEW_HOME', 'EDIT_HOME', 'VIEW_HOME', 'VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST',
    'ADD_NEW_PARTNER', 'EDIT_PARTNER', 'VIEW_PARTNER', 'VIEW_LIMITED_PARTNERS_LIST', 'VIEW_FULL_PARTNERS_LIST',
    'ADD_NEW_SENIOR', 'EDIT_SENIOR', 'VIEW_SENIOR', 'VIEW_LIMITED_SENIORS_LIST', 'VIEW_FULL_SENIORS_LIST',
    'ADD_NEW_VOLUNTEER', 'EDIT_VOLUNTEER', 'VIEW_VOLUNTEER', 'VIEW_LIMITED_VOLUNTEERS_LIST', 'VIEW_FULL_VOLUNTEERS_LIST',
    'VIEW_LIMITED_RECIPIENTS_LIST', 'VIEW_FULL_RECIPIENTS_LIST',
    'VIEW_LIMITED_ORDERS_LIST', 'VIEW_FULL_ORDERS_LIST'
  ),
  validateRequest(toponymSchemas.getToponymsListSchema, 'query'),
  async (req, res, next) => {
    try {
      const type = MAPS[req.query.typeOfToponym];
      const config = MAP[type];
      const ids = req.query.ids;

      const attributes = ['id', 'name'];
      const where = { isRestricted: false };
      if (config.parentIdField) {
        where[config.parentIdField] = {
          [Op.in]: ids,
        };

        attributes.push(config.parentIdField);
      }
      const toponyms = await config.Model.findAll({
        where,
        attributes,
        order: [['name', 'ASC']],
        raw: true
      });
      if (type == 'country') {
        toponyms.sort((a, b) => (b.name === "Россия") - (a.name === "Россия"));
      }
      res.status(200).send({ data: toponyms });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.get(
  '/toponyms',
  requireAuth,
  requireAny('VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST'),
  validateRequest(toponymSchemas.toponymQueryDTOSchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query;
      const config = MAP[query.type];

      const where = config.where(query);

      const include = config.listInclude(query);

      // AND (exact=true) vs OR
      if (query.search) {
        const words = query.search.split(/\s+/).filter(Boolean);
        // Build an iLike clause for each word across every searchable column.
        const makeLike = (word, field) => ({
          [field]: {
            [Op.iLike]: `%${word}%`,
          },
        });

        const wordClauses = words.map((word) => ({
          [Op.or]: config.searchFields.map((field) => makeLike(word, field)),
        }));

        Object.assign(
          where,
          query.exact
            ? {
              [Op.and]: wordClauses,
            }
            : {
              [Op.or]: wordClauses,
            },
        );
      }

      const order = config.order(query);

      const limit = query.pageSize;

      const attributes = config.attributes;

      const offset = query.page * query.pageSize;

      const [length, rows] =
        await Promise.all([
          config.Model.count({
            where,
            include,
            distinct: true,
          }),

          config.Model.findAll({
            where,
            attributes,
            order,
            include,
            limit,
            offset,
            raw: true,
            distinct: true,
          }),
        ]);

      const toponyms = rows.map((toponym) => postProcessor(toponym, query.type));

      res.status(200).json({
        data: { toponyms, length },
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.get(
  "/check-toponym-before-delete",
  requireAuth,
  validateRequest(
    toponymSchemas.deleteToponymSchema,
    'query',
  ),
  requireToponymDeletePermission,

  async (req, res, next) => {
    try {
      const query = req.query;
      const config = MAP[query.type];

      //only empty toponym or toponym with all blocked deps can be blocked
      const dependenciesCount = await countToponymDependencies(query, config);

      const response = {
        data: dependenciesCount,
        ...(dependenciesCount && {
          code: 'TOPONYM.HAS_DEPENDENCIES',
        }),
      };

      res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';

      next(error);
    }
  },
);

router.delete(
  "/delete-toponym",
  requireAuth,
  validateRequest(
    toponymSchemas.deleteToponymSchema,
    'query',
  ),
  requireToponymDeletePermission,

  async (req, res, next) => {
    try {
      const query = req.query;
      const config = MAP[query.type];

      await withTransaction(async (transaction) => {
        const dependenciesCount = await countToponymDependencies(query, config, transaction);

        if (dependenciesCount > 0) {
          throw new CustomError('ERRORS.TOPONYM.HAS_DEPENDENCIES', 409);
        }

        const where = {
          id: query.id,
        };

        if (query.destroy) {
          const destroyedCount = await config.Model.destroy({
              where,
              individualHooks: true,
              transaction,
            });

          if (destroyedCount === 0) {
            throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
          }

          return;
        }

        const [updatedCount] =
          await config.Model.update(
            {
              isRestricted: true,
            },
            {
              where,
              individualHooks: true,
              transaction,
            },
          );

        if (updatedCount === 0) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }

        await markAddressesUnrecoverable(query.type, query.id, transaction);
      });

      res.status(200).send({
        code: 'SUCCESS.DELETED',
        data: null,
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_DELETE_FAILED';

      next(error);
    }
  },
);

// country names are unique within DB
// region names are unique within DB because only one country (Russia) is supported
router.post(
  '/populate-toponyms',
  requireAuth,
  requireOperation('UPLOAD_LIST_OF_TOPONYMS'),
  validateRequest(toponymSchemas.bulkToponymsSchema, 'body'),
  async (req, res, next) => {
    try {
      let list = req.body.data;
      const type = req.body.type;
      const config = MAP_POPULATE[type];

      if (config.preprocessRow) {
        list = list.map((row) => ({
          ...config.preprocessRow(row),
          __i: row.__i,
        }));
      }

      const seen = new Set();

      const duplicates = [];

      for (const row of list) {
        const key = config.keyFromRow(row);

        if (seen.has(key)) {
          duplicates.push(row.name);
        } else {
          seen.add(key);
        }
      }

      if (duplicates.length) {
        throw new CustomError(
          'ERRORS.TOPONYM.BULK_INPUT_DUPLICATES',
          422,
          {
            duplicates: duplicates.join(', '),
          },
        );
      }

      const parents = await config.resolveParents(list);

      // Stop early if referenced parents are missing in the database.
      const missingParents = config.findMissingParents(list, parents);

      if (missingParents.length) {
        throw new CustomError(
          'ERRORS.TOPONYM.BULK_PARENT_NOT_FOUND',
          422,
          {
            parents: missingParents.join(', '),
          },
        );
      }

      const conflicts = await config.findConflicts(list, parents);

      if (conflicts.length) {
        throw new CustomError(
          'ERRORS.TOPONYM.FROM_BULK_ALREADY_EXISTS',
          409,
          {
            conflicts: conflicts.join(', '),
          },
        );
      }

      const payload = list.map((row) => config.buildPayload(row, parents));

      const created = await sequelize.transaction((transaction) =>
        config.Model.bulkCreate(payload, {
          validate: true,
          individualHooks: true,
          transaction,
        }),
      );

      return res.status(201).json({ code: 'SUCCESS.CREATED', data: created.length });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
      return next(error);
    }
  }
);

export default router;
