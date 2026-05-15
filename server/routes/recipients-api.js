import { Router } from "express";
import Sequelize from "sequelize";
//import Recipient from "../models/index.js";
import { validateRequest } from "../middlewares/validate-request.js";
import * as recipientSchemas from "../../shared/dist/schemas/recipient.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import requireAuth from '../middlewares/check-auth.js';
import { requireOperation, requireAny, requireAll } from '../middlewares/require-permission.js';
import { Occasion, Recipient, Senior, Home, HomeAddress, Region } from "../models/index.js";
import { generateRecipients } from "../controllers/ctrl-generate-recipients.js";
import { transformRecipient } from "../controllers/ctrl-transform-recipient.js";
import { applyNumericFilter, applyStringFilter, buildGlobalSearchWhere, buildOrderField } from "../controllers/ctrl-query-builders.js";
import { z } from 'zod';
import CustomError from "../shared/customError.js";
import { addRecipients, markAbsentRecipients } from "../controllers/ctrl-check-recipients.js";

const Op = Sequelize.Op;
const router = Router();

/**
 * POST /create-list
 * Create a new recipients list.
 */
router.post(
  "/create-list",
  requireAuth,
  requireOperation('CREATE_RECIPIENTS_LIST'),
  validateRequest(recipientSchemas.recipientIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.body;
      const occasion = await Occasion.findByPk(id);
      if (!occasion) throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);
      //TODO: ??проверка дублей при создании (думаю излишне)
      const controlRecipient = await Recipient.findOne({
        where: { occasionId: id }
      });
      if (controlRecipient) throw new CustomError('ERRORS.RECIPIENT.LIST_ALREADY_EXISTS', 409);

      const result = await withTransaction(async (t) => {
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

      res.status(200).send({ code: 'RECIPIENT.RECIPIENTS_LIST_CREATED', data: result.length });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.RECIPIENT.RECIPIENTS_LIST_NOT_CREATED';
      next(error);
    }
  }
);

router.patch(
  "/clear-list",
  requireAuth,
  requireOperation('CLEAR_RECIPIENTS_LIST'),
  validateRequest(z.object({
    occasionId: z.coerce.number().int().positive(),
  }), 'body'),
  async (req, res, next) => {
    try {
      const { occasionId } = req.body;
      await withTransaction(async (t) => {
        const occasion = await Occasion.findByPk(occasionId);
        if (!occasion) throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);

        /*    const dependent = await Order.findOne({
             where: { occasionId },
             transaction: t,
           });

           if (dependent) {
             throw new CustomError('ERRORS.RECIPIENT.HAS_DEPENDENCIES', 409);
           } */

        await Recipient.destroy({
          where: { occasionId },
          transaction: t,
          individualHooks: true,
        });

      });

      const finalControl = await Recipient.count({
        where: { occasionId }
      });
      await Occasion.update(
        { amount: finalControl },
        {
          where: { id: occasionId },
        }
      );

      if (finalControl > 0) throw new CustomError('ERRORS.RECIPIENT.RECIPIENTS_LIST_NOT_CLEARED', 500);

      res.status(200).send({ code: 'RECIPIENT.RECIPIENTS_LIST_CLEARED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.RECIPIENT.RECIPIENTS_LIST_NOT_CLEARED';
      next(error);
    }
  }
);

router.post(
  "/create-recipients",
  requireAuth,
  requireOperation('ADD_NEW_RECIPIENT'),
  validateRequest(z.object({
    seniorsIds: z.array(z.number().int().positive()),
    occasionId: z.coerce.number().int().positive(),
  }), 'body'),
  async (req, res, next) => {
    try {
      const { seniorsIds, occasionId } = req.body;
      const occasion = await Occasion.findByPk(occasionId);
      if (!occasion) throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);

      const result = await withTransaction(async (t) => {
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

      res.status(200).send({ code: 'RECIPIENT.RECIPIENTS_LIST_CREATED', data: result.length });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.RECIPIENT.RECIPIENTS_LIST_NOT_CREATED';
      next(error);
    }
  }
);


/**
 * GET /get-recipients
 * Return recipients.
 */
router.post(
  "/get-recipients",
  requireAuth,
  requireAny('VIEW_LIMITED_RECIPIENTS_LIST', 'VIEW_FULL_RECIPIENTS_LIST'),
  validateRequest(recipientSchemas.recipientQueryDTOSchema, 'body'),
  async (req, res, next) => {
    try {
      // Recipients
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

      const field = buildOrderField(sortField);

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

      const requiredHome = filters.homeName !== undefined;
      const requiredRegion = filters.regionName !== undefined;

      const searchWhere = buildGlobalSearchWhere(searchValue);

      if (searchWhere) {
        where[Op.and] = searchWhere;
      }


      const include = [
        {
          model: Senior,
          as: 'senior',
          attributes: ['id'],
          required: requiredHome || requiredRegion || Boolean(searchValue),
          include: [
            {
              model: Home,
              as: 'home',
              where: whereHome,
              required: requiredHome || requiredRegion || Boolean(searchValue),
              attributes: ['homeName'],
              include: [
                {
                  model: HomeAddress,
                  as: 'activeAddress',
                  attributes: ['id'],
                  where: { isRestricted: false },
                  required: requiredRegion || Boolean(searchValue),
                  include: [
                    {
                      model: Region,
                      where: whereRegion,
                      required: requiredRegion || Boolean(searchValue),
                      attributes: ['id', 'name']
                    },
                  ]
                }
              ]
            },
          ]
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
      error.code = 'ERRORS.RECIPIENT.LIST_FAILED';
      next(error);
    }
  }
);

router.delete(
  '/delete-recipients',
  requireAuth,
  requireOperation('DELETE_RECIPIENT'),
  validateRequest(
    z.object({
      recipientIds: z.array(z.coerce.number().int().positive()).min(1),
      occasionId: z.coerce.number().int().positive(),
    }),
    'body',
  ),
  async (req, res, next) => {
    try {
      const { recipientIds, occasionId } = req.body;

      await withTransaction(async (t) => {
        const recipients = await Recipient.findAll({
          where: { id: { [Op.in]: recipientIds } },
          attributes: ['id'],
          transaction: t,
        });

        if (recipients.length !== recipientIds.length) {
          throw new CustomError('ERRORS.RECIPIENT.NOT_FOUND', 404);
        }

        // Если потом будут зависимости — проверяй тут:
        /*
        const dependent = await OrderRecipient.findOne({
          where: { recipientId: { [Op.in]: recipientIds } },
          transaction: t,
        });

        if (dependent) {
          throw new CustomError('ERRORS.RECIPIENT.HAS_DEPENDENCIES', 409);
        }
        */

        const destroyed = await Recipient.destroy({
          where: { id: { [Op.in]: recipientIds } },
          transaction: t,
          individualHooks: true,
        });

        await Occasion.decrement(
          { amount: destroyed },
          { where: { id: occasionId }, transaction: t }
        );

        if (destroyed !== recipientIds.length) {
          throw new CustomError('ERRORS.RECIPIENT.NOT_DELETED', 500);
        }
      });

      res.status(200).send({
        code: 'RECIPIENT.DELETED',
        data: null,
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.RECIPIENT.NOT_DELETED';
      next(error);
    }
  },
);

router.patch(
  '/check-list',
  requireAuth,
  requireAny('EDIT_RECIPIENTS_LIST'),
  validateRequest(z.object({
    occasionId: z.coerce.number().int().positive(),
  }), 'body'),
  async (req, res, next) => {
    try {
      const occasionId = req.body.occasionId;
      const occasion = await Occasion.findByPk(occasionId);
      if (!occasion) throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);

      await withTransaction(async (t) => {
        // const duplicates = await findDuplicatesRecipients(occasionId, t);
        const {added, returned} = await addRecipients(occasion, t);
        //const deleted = await deleteRecipients(occasionId, t);
        const absent = await markAbsentRecipients(occasion, t);

        res.status(200).send({
          code: 'RECIPIENT.CHECKED',
          data: { added, returned, absent,/* deleted, duplicates */ }
        });
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.RECIPIENT.NOT_CHECKED';
      next(error);
    }
  }
);

/* router.patch(
  '/edit-recipient',
  requireAuth,
  requireAny('UNBLOCK_RECIPIENT', 'BLOCK_RECIPIENT'),
  validateRequest(z.object({
    id: z.coerce.number().int().positive(),
    status: z.boolean()
  }), 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const status = req.body.status;

      await withTransaction(async (t) => {
        const [affected] = await Recipient.update(
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
          throw new CustomError('ERRORS.RECIPIENT.NOT_FOUND', 404);
        }
      });

      res.status(200).send({ code: 'RECIPIENT.EDITED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.RECIPIENT.NOT_EDITED';
      next(error);
    }
  }
); */

export default router;
