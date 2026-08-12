import { Router } from "express";
import { Occasion, Recipient } from "../models/index.js";
import CustomError from '../shared/customError.js';
import * as occasionSchemas from "../../shared/dist/schemas/occasion.schema.js";
import requireAuth from '../middlewares/check-auth.js';
import { validateRequest } from "../middlewares/validate-request.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { withTransaction } from "../controllers/with-transaction.js";
import { transformOccasionDisplayParts } from "../controllers/ctrl-transform-occasion.js";

const router = Router();

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

      const exists = duplicate !== null;

      res.status(200).send({
        data: exists,
        ...(exists && { code: 'ERRORS.OCCASION.ALREADY_EXISTS' }),
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.post(
  "/create-occasion",
  requireAuth,
  requireOperation('ADD_NEW_OCCASION'),
  validateRequest(occasionSchemas.occasionDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const { type, month, year, status } = req.body;

      const result = await withTransaction(async (t) => {
        const occasion = await Occasion.create(
          {
            type,
            month,
            year,
            status
          },
          { transaction: t });
        return transformOccasionDisplayParts(occasion);
      });

      res.status(200).send({ code: 'SUCCESS.CREATED', data: result.type });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
      next(error);
    }
  }
);

router.get(
  "/get-occasions",
  requireAuth,
  requireOperation('VIEW_LIMITED_OCCASIONS_LIST'),
  async (req, res, next) => {
    try {
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

      // Build unique filter options from occasion data.
      const buildOptions = (items, keys) => {
        const result = {};

        for (const key of keys) {
          result[key] = [
            ...new Set(
              items
                .map(item => item[key])
                .filter(v => v !== null && v !== undefined)
            ),
          ].sort((a, b) => a - b);
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

      res.status(200).send({ data: { occasions, options } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
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
      const draft = await Occasion.findByPk(req.params.id, {
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt']
        },
      });
      if (!draft) {
        throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      }

      const occasion = transformOccasionDisplayParts(draft);
      res.status(200).send({ data: occasion });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
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
        const occasion = await Occasion.findByPk(id, { transaction: t });

        if (!occasion) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        // Check for dependent recipients.
        const dependent = await Recipient.findOne({
          where: { occasionId: id },
          transaction: t,
        });

        if (dependent) throw new CustomError('ERRORS.OCCASION_HAS_DEPENDENCIES', 409);

        const destroyed = await Occasion.destroy({
          where: { id },
          transaction: t,
          individualHooks: true,
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      });

      res.status(200).send({ code: 'SUCCESS.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_DELETE_FAILED';
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
      const { id, status } = req.body;

      await withTransaction(async (t) => {
        const [affected] = await Occasion.update(
          {
            status
          },
          {
            where: { id },
            transaction: t,
            individualHooks: true,
          }
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  }
);

router.get(
  "/get-actual-occasions/:typeId",
  requireAuth,
  requireOperation('ADD_NEW_ORDER'),
  validateRequest(occasionSchemas.occasionTypeIdSchema, 'params'),
  async (req, res, next) => {
    try {
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
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

export default router;
