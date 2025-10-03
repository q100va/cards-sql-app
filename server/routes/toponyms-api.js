import { Router } from "express";
import { Op } from 'sequelize';
import { UserAddress } from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { validateRequest } from "../middlewares/validate-request.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import CustomError from "../shared/customError.js";
import * as toponymSchemas from "../../shared/dist/toponym.schema.js";
import { findDuplicate, postProcessor, getToponymById, MAP, MAPS, MAP_POPULATE } from "../controllers/ctrl-toponyms.js";
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
// API to check duplicate toponym name

router.get(
  "/check-toponym-name",
  requireAuth,
  requireAny('ADD_NEW_TOPONYM', 'EDIT_TOPONYM'),
  validateRequest(toponymSchemas.checkToponymNameSchema, "query"),
  async (req, res, next) => {
    try {
      const query = req.query;
      const duplicateCount = await findDuplicate(query);
      //console.log("duplicate", duplicateCount);
      const response = {
        data: duplicateCount !== 0,
        ...(duplicateCount ? { code: 'TOPONYM.ALREADY_EXISTS' } : null),
      };

      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.NAME_NOT_CHECKED';
      next(error);
    }
  });

// API to create toponym

router.post(
  '/create-toponym',
  requireAuth,
  requireOperation('ADD_NEW_TOPONYM'),
  validateRequest(toponymSchemas.saveToponymSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = req.body;

      const cfg = MAP[data.type];
      for (const key of cfg.needs) {
        if (data[key] == null) {
          throw new CustomError('ERRORS.VALIDATION', 422);
        }
      }
      const payload = {
        ...pick(data, cfg.needs)
      };
      const created = await cfg.Model.create(payload);
      const toponym = await getToponymById(created.id, data.type);
      //console.log("toponym", toponym);

      res.status(201).json({ code: 'TOPONYM.CREATED', data: toponym });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.NOT_CREATED';
      next(error);
    }
  }
);

// API to update toponym

router.post("/update-toponym",
  requireAuth,
  requireOperation('EDIT_TOPONYM'),
  validateRequest(toponymSchemas.saveToponymSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = req.body;
      const cfg = MAP[data.type];

      for (const key of cfg.attributes) {
        if (data[key] == null) {
          throw new CustomError('ERRORS.VALIDATION', 422);
        }
      }

      const payload = {
        ...pick(data, cfg.needs)
      };
      const [updatedCount] = await cfg.Model.update(payload, {
        where: {
          id: data.id
        }
      });
      //console.log("updated", updated);
      if (updatedCount === 0) {
        throw new CustomError('ERRORS.TOPONYM.NOT_FOUND', 404);
      }
      const toponym = await getToponymById(data.id, data.type);
      res.status(201).json({ code: 'TOPONYM.UPDATED', data: toponym });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.NOT_UPDATED';
      next(error);
    }
  }
);

// API to get toponym by id

router.get("/get-:type-by-id/:id",
  requireAuth,
  requireAny('EDIT_TOPONYM', 'VIEW_TOPONYM'),
  validateRequest(toponymSchemas.findToponymByIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, id } = req.params;
      const toponym = await getToponymById(id, type);
      res.status(201).json({ data: toponym });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.NOT_FOUND';
      next(error);
    }
  });

// API to get address elements for address filter

router.get("/get-toponyms-list",
  requireAuth,
  requireAny('EDIT_TOPONYM', 'VIEW_TOPONYM'),//TODO: add more permissions
  validateRequest(toponymSchemas.getToponymsListSchema, 'query'),
  async (req, res, next) => {
    try {
      const type = MAPS[req.query.typeOfToponym];
      const cfg = MAP[type];
      const ids = req.query.ids;

      let attributes = ['id', 'name'];
      let where = { isRestricted: false };
      if (cfg.needParent) {
        where[cfg.needParent] = { [Op.in]: ids };
        attributes.push(cfg.needParent);
      }
      const toponyms = await cfg.Model.findAll({
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
      error.code = error.code ?? 'ERRORS.TOPONYM.NAME_LIST_FAILED';
      next(error);
    }
  });

// APT get list of toponyms for table with filter, sort and pagination

router.get(
  '/toponyms',
  requireAuth,
  requireAny('VIEW_LIMITED_TOPONYMS_LIST', 'VIEW_FULL_TOPONYMS_LIST'),
  validateRequest(toponymSchemas.getToponymsSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query;
      const cfg = MAP[q.type];

      // where + include
      const where = cfg.where(q) || {};
      const include = cfg.include(q);

      // AND (exact=true) vs OR
      if (q.search) {
        const words = q.search.split(/\s+/).filter(Boolean);
        // Build an iLike clause for each word across every searchable column.
        const makeLike = (w, field) => ({ [field]: { [Op.iLike]: `%${w}%` } });
        const wordClauses = words.map((w) => ({
          [Op.or]: cfg.searchFields.map((f) => makeLike(w, f)),
        }));
        Object.assign(where, q.exact ? { [Op.and]: wordClauses } : { [Op.or]: wordClauses });
      }

      const order = cfg.order(q);
      const limit = q.pageSize;
      const attributes = cfg.attributes;
      const offset = q.page * q.pageSize;

      const [length, rows] = await Promise.all([
        cfg.Model.count({
          where,
          include,
        }),
        cfg.Model.findAll({
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

      const toponyms = rows.map((t) => postProcessor(t, q.type));

      res.status(200).json({
        data: { toponyms, length /* , page: q.page, pageSize: q.pageSize  */ },
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.LIST_FAILED';
      next(error);
    }
  }
);

//API to check and delete toponym

router.get("/check-toponym-before-delete",
  requireAuth,
  requireAny('BLOCK_TOPONYM', 'DELETE_TOPONYM'),
  validateRequest(toponymSchemas.deleteToponymSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query;
      const cfg = MAP[q.type];
      //all, even restricted: only empty toponym can be deleted
      const whereAll = {
        [q.type + 'Id']: q.id,
      };
      //only non-restricted: only empty toponym or toponym with all blocked deps can be blocked
      const whereNonRestricted = {
        isRestricted: false,
        [q.type + 'Id']: q.id,
      };

      const [countPeople, countHomes, countChildren] = await Promise.all([
        UserAddress.count({
          where: q.destroy ? whereAll : whereNonRestricted
        }),
        UserAddress.count({ //TODO: change to HomeAddress when model will be created
          where: q.destroy ? whereAll : whereNonRestricted
        }),
        cfg.ChildModel?.count({
          where: q.destroy ? whereAll : whereNonRestricted
        })
      ]);
      const count = countPeople + countHomes + (countChildren ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'TOPONYM.HAS_DEPENDENCIES' } : null),
      };

      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.NOT_CHECKED';
      next(error);
    }
  });

router.delete("/delete-toponym",
  requireAuth,
  requireAny('BLOCK_TOPONYM', 'DELETE_TOPONYM'),
  validateRequest(toponymSchemas.deleteToponymSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query;
      const cfg = MAP[q.type];
      const where = { id: q.id };
      if (q.destroy) {
        const destroyedCount = await cfg.Model.destroy({ where });
        if (destroyedCount === 0) {
          throw new CustomError('ERRORS.TOPONYM.NOT_FOUND', 404);
        }
      } else {
        const [updatedCount] = await cfg.Model.update(
          {
            isRestricted: true,
          },
          { where }
        );
        if (updatedCount === 0) {
          throw new CustomError('ERRORS.TOPONYM.NOT_FOUND', 404);
        }
      }
      res.status(200).send({ code: 'TOPONYM.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.NOT_DELETED';
      next(error);
    }
  });


//************************

// API populate address elements
// country names are unique within DB
// region names are unique within DB because only one country (Russia) is supported
router.post(
  '/populate-toponyms',
  requireAuth,
  requireOperation('ADD_NEW_TOPONYM'),
  validateRequest(toponymSchemas.bulkToponymsSchema, 'body'),
  async (req, res, next) => {
    try {
      let list = req.body.data;
      const type = req.body.type;
      const cfg = MAP_POPULATE[type];

      if (cfg.preprocessRow) list = list.map(r => ({ ...cfg.preprocessRow(r), __i: r.__i }));

      const seen = new Set();
      const dup = [];
      for (const r of list) {
        const key = cfg.keyFromRow(r);
        if (seen.has(key)) dup.push(r.name);
        else seen.add(key);
      }
      if (dup.length) throw new CustomError('ERRORS.TOPONYM.BULK_INPUT_DUPLICATES', 422, { duplicates: dup.join(', ') });

      const parents = await cfg.findParents(list);
      //console.log("DIST");
      //console.log(parents);
      // Stop early if referenced parents are missing in the database.
      const missingParents = cfg.missingParents(list, parents);
      if (missingParents.length) {
        throw new CustomError('ERRORS.TOPONYM.BULK_PARENT_NOT_FOUND', 422, { parents: missingParents.join(', ') });
      }

      let conflicts = [];
      if (cfg.existingQuery) {
        conflicts = await cfg.existingQuery(list, parents);
      } else {
        const keys = [...new Set(list.map(cfg.keyFromRow))];
        const existing = await cfg.Model.findAll({
          attributes: ['name'],
          where: cfg.dbWhereFromKeys(keys, parents),
          raw: true,
        });
        conflicts = existing.map(e => e.name);
      }
      if (conflicts.length) {
        throw new CustomError('ERRORS.TOPONYM.FROM_BULK_ALREADY_EXISTS', 409, { conflicts: conflicts.join(', ') });
      }

      // Flatten each row into Sequelize payload records before bulk create.
      const payload = list.flatMap(r => cfg.buildPayload(r, parents));
      const created = await sequelize.transaction(t =>
        cfg.Model.bulkCreate(payload, { validate: true, individualHooks: true, transaction: t })
      );

      return res.status(201).json({ code: 'TOPONYM.BULK_CREATED', data: created.length });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.BULK_NOT_CREATED';
      return next(error);
    }
  }
);

export default router;

//TODO: создать в БД соседние районы по умолчанию. + настройка у админа и координатора школ?
