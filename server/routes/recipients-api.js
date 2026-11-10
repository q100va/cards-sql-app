import { Router } from "express";
import { Op } from 'sequelize';
import { Occasion, Recipient, Senior, Home, HomeAddress, Region, Order, OrderRecipient, } from "../models/index.js";
import CustomError from "../shared/customError.js";
import * as recipientSchemas from "../../shared/dist/schemas/recipient.schema.js";
import requireAuth from '../middlewares/check-auth.js';
import { validateRequest } from "../middlewares/validate-request.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { withTransaction } from "../controllers/with-transaction.js";
import { generateRecipients } from "../controllers/ctrl-generate-recipients.js";
import { transformRecipient } from "../controllers/ctrl-transform-recipient.js";
import { addRecipients, markAbsentRecipients } from "../controllers/ctrl-check-recipients.js";
import { applyNumericFilter, applyStringFilter } from "../controllers/ctrl-apply-filter.js";
import { buildGlobalSearchWhere, buildRecipientOrderField } from "../controllers/ctrl-recipient-query-builders.js";

const router = Router();

router.post(
  "/create-list",
  requireAuth,
  requireOperation('CREATE_RECIPIENTS_LIST'),
  validateRequest(recipientSchemas.occasionIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (t) => {
        const { occasionId } = req.body;
        const occasion = await Occasion.findByPk(occasionId, {
          transaction: t,
        });
        if (!occasion) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        const controlRecipient = await Recipient.findOne({
          where: { occasionId },
          transaction: t,
        });
        if (controlRecipient) throw new CustomError('ERRORS.RECIPIENT.LIST_ALREADY_EXISTS', 409);

        const rows = await generateRecipients(occasion, t);
        const created = await Recipient.bulkCreate(rows, { transaction: t, individualHooks: true, });

        await Occasion.update(
          { amount: created.length },
          {
            where: { id: occasion.id },
            transaction: t,
          }
        );

        return created;
      });

      res.status(200).send({ code: 'SUCCESS.DATA_ADDED', data: result.length });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_ADD_FAILED';
      next(error);
    }
  });
// TODO: Check for duplicate recipients across homes.

router.patch(
  "/clear-list",
  requireAuth,
  requireOperation('CLEAR_RECIPIENTS_LIST'),
  validateRequest(recipientSchemas.occasionIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const { occasionId } = req.body;
      await withTransaction(async (t) => {
        const occasion = await Occasion.findByPk(occasionId, {
          transaction: t,
        });
        if (!occasion) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        // Prevent deletion of recipients used in orders.
        const dependent = await Order.findOne({
          where: { occasionId },
          transaction: t,
        });
        if (dependent) {
          throw new CustomError('ERRORS.RECIPIENT.LIST_HAS_DEPENDENCIES', 409);
        }

        await Recipient.destroy({
          where: { occasionId },
          transaction: t,
          individualHooks: true,
        });

        const finalControl = await Recipient.count({
          where: { occasionId },
          transaction: t,
        });
        await Occasion.update(
          { amount: finalControl },
          {
            where: { id: occasionId },
            transaction: t,
          }
        );

        if (finalControl > 0) throw new CustomError('ERRORS.DATA_DELETE_FAILED', 500);
      });
      res.status(200).send({ code: 'SUCCESS.DATA_DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_DELETE_FAILED';
      next(error);
    }
  }
);

router.post(
  "/create-recipients",
  requireAuth,
  requireOperation('ADD_NEW_RECIPIENT'),
  validateRequest(recipientSchemas.recipientListDataSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (t) => {
        const { seniorsIds, occasionId } = req.body;
        const occasion = await Occasion.findByPk(occasionId, {
          transaction: t,
        });
        if (!occasion) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        const rows = await generateRecipients(occasion, t, seniorsIds);
        const created = await Recipient.bulkCreate(rows, { transaction: t, individualHooks: true, });
        await Occasion.increment(
          { amount: created.length },
          {
            where: { id: occasion.id },
            transaction: t,
          }
        );

        return created;
      });

      res.status(200).send({ code: 'SUCCESS.DATA_ADDED', data: result.length });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_ADD_FAILED';
      next(error);
    }
  }
);

router.post(
  "/get-recipients",
  requireAuth,
  requireAny('VIEW_LIMITED_RECIPIENTS_LIST', 'VIEW_FULL_RECIPIENTS_LIST'),
  validateRequest(recipientSchemas.recipientQueryDTOSchema, 'body'),
  async (req, res, next) => {
    try {
      const {
        occasionId,
        offset,
        limit,
        sortField,
        sortOrder,
        searchValue,
        filters
      } = req.body;
      const dir = sortOrder === -1 ? 'DESC' : 'ASC';
      const field = buildRecipientOrderField(sortField);

      // Build filters for recipients and related entities.
      const where = { occasionId };
      const whereHome = {};
      const whereRegion = {};

      if (filters.acceptableForSchool !== undefined) {
        where.acceptableForSchool = filters.acceptableForSchool[0].value;
      }
      if (filters.isAbsent !== undefined) {
        where.isAbsent = filters.isAbsent[0].value;
      }
      if (filters.plusAmount !== undefined) {
        applyNumericFilter(where, filters, 'plusAmount');
      }
      if (filters.birthYear !== undefined) {
        applyNumericFilter(where, filters, 'birthYear');
      }
      if (filters.birthMonth !== undefined) {
        applyNumericFilter(where, filters, 'birthMonth');
      }
      if (filters.birthDay !== undefined) {
        applyNumericFilter(where, filters, 'birthDay');
      }
      if (filters.category !== undefined) {
        applyStringFilter(where, filters, 'category');
      }
      if (filters.specialComment !== undefined) {
        applyStringFilter(where, filters, 'specialComment');
      }
      if (filters.fullName !== undefined) {
        applyStringFilter(where, filters, 'fullName');
      }
      if (filters.homeName !== undefined) {
        applyStringFilter(whereHome, filters, 'homeName');
      }
      if (filters.regionName !== undefined) {
        applyStringFilter(whereRegion, filters, 'regionName');
      }

      // Require joins only when related filters or search are used.
      const requiredHome = filters.homeName !== undefined;
      const requiredRegion = filters.regionName !== undefined;

      const searchWhere = buildGlobalSearchWhere(searchValue);

      if (searchWhere) {
        where[Op.and] = searchWhere;
      }

      const include = [
        {
          model: Region,
          as: 'snapshotRegion',
          where: whereRegion,
          required: requiredRegion || Boolean(searchValue),
          attributes: ['name'],
        },
        {
          model: Home,
          as: 'snapshotHome',
          where: whereHome,
          required: requiredHome || Boolean(searchValue),
          attributes: ['homeName'],
        },
      ];

      const total = await Recipient.count({
        where: where,
        include: include,
        distinct: true,
      });

      const draft = await Recipient.findAll({
        where: where,
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt']
        },
        order: [[field, dir]],
        include: include,
        offset: offset,
        limit: limit,
        distinct: true,
      });
      const recipients = draft.map(r => transformRecipient(r));

      res
        .status(200)
        .send({ data: { list: recipients, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.delete(
  '/delete-recipients',
  requireAuth,
  requireOperation('DELETE_RECIPIENT'),
  validateRequest(recipientSchemas.recipientDestroySchema, 'body'),
  async (req, res, next) => {
    try {
      const { recipientIds, occasionId } = req.body;

      await withTransaction(async (t) => {
        const recipients = await Recipient.findAll({
          where: {
            id: { [Op.in]: recipientIds },
            occasionId,
          },
          attributes: ['id'],
          transaction: t,
        });

        if (recipients.length !== recipientIds.length) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }

        // Prevent deletion of recipients used in orders.
        const dependent = await OrderRecipient.findOne({
          where: { recipientId: { [Op.in]: recipientIds } },
          transaction: t,
        });

        if (dependent) {
          throw new CustomError('ERRORS.RECIPIENT.HAS_DEPENDENCIES', 409);
        }

        const destroyed = await Recipient.destroy({
          where: {
            id: { [Op.in]: recipientIds },
            occasionId,
          },
          transaction: t,
          individualHooks: true,
        });

        await Occasion.decrement(
          { amount: destroyed },
          { where: { id: occasionId }, transaction: t }
        );

        if (destroyed !== recipientIds.length) {
          throw new CustomError('ERRORS.DATA_DELETE_FAILED', 500);
        }
      });

      res.status(200).send({
        code: 'SUCCESS.DATA_DELETED',
        data: null,
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_DELETE_FAILED';
      next(error);
    }
  },
);

router.patch(
  '/check-list',
  requireAuth,
  requireOperation('EDIT_RECIPIENTS_LIST'),
  validateRequest(recipientSchemas.occasionIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (t) => {
        const occasionId = req.body.occasionId;
        const occasion = await Occasion.findByPk(occasionId, {
          transaction: t,
        });
        if (!occasion) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        const { added, returned } = await addRecipients(occasion, t);
        const absent = await markAbsentRecipients(occasion, t);

        return { added, returned, absent };
      });

      res.status(200).send({
        code: 'SUCCESS.DATA_CHECKED',
        data: result
      });

    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  }
);

export default router;
