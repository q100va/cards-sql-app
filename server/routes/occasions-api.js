import { Router } from "express";
import Sequelize from "sequelize";
//import Occasion from "../models/index.js";
import { validateRequest } from "../middlewares/validate-request.js";
import * as occasionSchemas from "../../shared/dist/schemas/occasion.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import requireAuth from '../middlewares/check-auth.js';
import { requireOperation, requireAny, requireAll } from '../middlewares/require-permission.js';
import { Occasion } from "../models/index.js";
import { transformOccasionDisplayParts } from "../controllers/ctrl-transform-occasion.js";

const Op = Sequelize.Op;
const router = Router();

/**
 * GET /check-occasion-name/:name
 * Check if a occasion with the given name already exists (case-insensitive).
 */
router.get(
  "/check-occasion-data",
  requireAuth,
  requireAny('ADD_NEW_OCCASION', 'EDIT_OCCASION'),
  validateRequest(occasionSchemas.occasionDataSchema, "query"),
  async (req, res, next) => {
    try {
      const { type, year, month } = req.query;
      const whereParams = {
        type,
        year
      };
      if (month) whereParams.month = month;
      const duplicate = await Occasion.findOne({
        where: whereParams,
        attributes: ["id"],
        raw: true,
      });
      let response = {};
      response.data = duplicate !== null;
      if (duplicate !== null) response.code = 'OCCASION.ALREADY_EXISTS';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = 'ERRORS.OCCASION.DATA_NOT_CHECKED';
      next(error);
    }
  }
);

/**
 * POST /create-occasion
 * Create a new occasion and insert default operations for it.
 */
router.post(
  "/create-occasion",
  requireAuth,
  requireOperation('ADD_NEW_OCCASION'),
  validateRequest(occasionSchemas.occasionDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const { type, month, year, status } = req.body;

      const result = await withTransaction(async (t) => {
        // Create occasion
        const occasion = await Occasion.create({
          type,
          month,
          year,
          status
        }, { transaction: t });
        return transformOccasionDisplayParts(occasion);
      });

      res.status(200).send({ code: 'OCCASION.CREATED', data: result.type });
    } catch (error) {
      error.code = 'ERRORS.OCCASION.NOT_CREATED';
      next(error);
    }
  }
);

/**
 * GET /get-occasions
 * Return occasions and their operations with access/disabled flags.
 */
router.get(
  "/get-occasions",
  requireAuth,
  requireOperation('VIEW_LIMITED_OCCASIONS_LIST'),
  async (req, res, next) => {
    try {
      // Occasions
      const draft = await Occasion.findAll({
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt']
        },
        order: [["id", "DESC"]],
        raw: true,
      });
      const occasions = draft.map(o => transformOccasionDisplayParts(o));

      const buildOptions = (items, keys) => {
        const result = {};
        /*
                const MAP = {
                  date: 'dateNameKey',
                  month: 'monthOptionKey',
                  year: 'year',
                  type: 'typeNameKey',
                  status: 'statusNameKey'
                }
         */
        for (const key of keys) {
          result[key] = [
            ...new Set(
              items
                .map(item => item[key])
                .filter(v => v !== null && v !== undefined)
            ),
          ].sort();
        }

        return result;
      };

      const options = buildOptions(occasions, [
        'date',
        'month',
        'year',
        'type',
        'status',
      ]);

      res
        .status(200)
        .send({ data: { occasions, options } });
    } catch (error) {
      error.code = 'ERRORS.OCCASION.LIST_FAILED';
      next(error);
    }
  }
);

router.get(
  "/get-occasion-by-id/:id",
  requireAuth,
  requireAny('VIEW_LIMITED_RECIPIENTS_LIST', 'VIEW_FULL_RECIPIENTS_LIST'),
  validateRequest(occasionSchemas.occasionIdSchema, 'params'),
  async (req, res, next) => {
    try {
      // Occasions
      console.log('id', req.params.id);
      const draft = await Occasion.findByPk(req.params.id, {
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt']
        },
      });
      const occasion = transformOccasionDisplayParts(draft);
      res
        .status(200)
        .send({ data: occasion });
    } catch (error) {
      error.code = 'ERRORS.OCCASION.NOT_FOUND';
      next(error);
    }
  }
);

router.delete(
  "/delete-occasion/:id",
  requireAuth,
  requireOperation('DELETE_OCCASION'),
  validateRequest(occasionSchemas.occasionIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        // 1) Ensure the occasion exists
        const occasion = await Occasion.findByPk(id, { transaction: t });
        if (!occasion) throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);

        // 2) Check before delete
        /*         const dependent = await Celebrator.findOne(
                  { where: { occasionId: id } }
                );
                if (dependent) throw new CustomError('ERRORS.OCCASION.HAS_DEPENDENCIES', 409);
         */

        // 3) Delete the occasion
        const destroyed = await Occasion.destroy({
          where: { id },
          transaction: t,
          individualHooks: true, // will run user-level hooks; children won't fire via DB cascade
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);
      });
      res.status(200).send({ code: 'OCCASION.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.OCCASION.NOT_DELETED';
      next(error);
    }
  });

router.patch(
  '/edit-occasion',
  requireAuth,
  requireAny('UNBLOCK_OCCASION', 'BLOCK_OCCASION'),
  validateRequest(occasionSchemas.occasionEditSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const status = req.body.status;

      await withTransaction(async (t) => {
        // 1) Block the user
        const [affected] = await Occasion.update(
          {
            status
          },
          {
            where: { id },
            transaction: t,
            individualHooks: true, // ensure per-row hooks/audit
          }
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);
        }
      });

      res.status(200).send({ code: 'OCCASION.EDITED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.OCCASION.NOT_EDITED';
      next(error);
    }
  }
);

router.get(
  "/get-actual-occasions/:typeId",
  requireAuth,
  requireOperation('ADD_NEW_ORDER'),
  async (req, res, next) => {
    try {
      // Occasions
      const draft = await Occasion.findAll({
        where: {
          status: 1,
          type: req.params.typeId
        },
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt']
        },
        order: [
          ['year', 'DESC'],
          ['month', 'DESC'],
        ],
        raw: true,
      });
      const occasions = draft.map(o => transformOccasionDisplayParts(o));

      res
        .status(200)
        .send({ data: occasions });
    } catch (error) {
      error.code = 'ERRORS.OCCASION.LIST_FAILED';
      next(error);
    }
  }
);

export default router;
