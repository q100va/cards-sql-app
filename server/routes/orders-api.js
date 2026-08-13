import { Router } from "express";
import { literal, Op } from 'sequelize';
import { number, z } from 'zod';
import {
  Order, Region, Home, HomeAddress, OrderRecipient,
  Volunteer, VolunteerContact,
  User, Institute, Occasion,
  Recipient
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import { createRecipientsList } from "../controllers/ctrl-create-order.js";
import * as orderSchemas from "../../shared/dist/schemas/order.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { createSpecialRecipientsList } from "../controllers/ctrl-create-special-order.js";
import { transformOrder, transformOrderDisplayPart, transformOrderRecipientsPart } from "../controllers/ctrl-transform-order.js";
import { applyDateFilter, applyNumericFilter, applyStringFilter } from "../controllers/ctrl-query-builders.js";
import { dictToOptions, getOccasionMonthSortExpression, getOccasionTypeSortExpression, getOrderSortField, getOrderSourceSortExpression, getOrderStatusSortExpression, ORDER_SOURCES, ORDER_STATUSES } from "../controllers/ctrl-order-query-builders.js";
import { buildOccasionNodes } from "../controllers/ctrl-build-occasion-nodes.js";

const router = Router();
const orderIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});


/*
function applyOrderNumericFilter(where, filters, field) {
  const fieldFilters = filters[field];
  if (!fieldFilters?.length) return;

  const value = Number(fieldFilters[0].value);
  if (Number.isFinite(value)) {
    where[field] = value;
  }
}

function applyOrderDateFilter(where, filters, field) {
  const fieldFilters = filters[field];
  if (!fieldFilters?.length) return;

  const value = new Date(fieldFilters[0].value);
  if (!Number.isNaN(value.getTime())) {
    const nextDay = new Date(value);
    nextDay.setDate(nextDay.getDate() + 1);
    where[field] = { [Op.gte]: value, [Op.lt]: nextDay };
  }
} */

router.get("/get-filters-data",
  requireAuth,
  requireAny('ADD_NEW_ORDER'),
  async (req, res, next) => {
    try {

      const regions = await Region.findAll({
        where: { isRestricted: false, countryId: 143 },
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
        raw: true
      });
      let homes = await Home.findAll({
        where: { isRestricted: false, isClose: false },
        attributes: ['id', 'homeName'],
        include: {
          model: HomeAddress,
          as: 'activeAddress',
          attributes: ['regionId'],
        },
        order: [['homeName', 'ASC']],
        raw: true
      });
      console.log('HOMES', homes);

      homes = homes.map(h => ({
        id: h.id,
        name: h.homeName,
        regionId: h['activeAddress.regionId']
      }));


      res.status(200).send({ data: { regions, homes } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ORDER.FILTER_DATA_FAILED';
      next(error);
    }
  }
);

router.get("/check-order",
  requireAuth,
  requireAny('ADD_NEW_ORDER'),
  validateRequest(z.object({
    volunteerId: z.coerce.number().int().positive(),
    occasionId: z.coerce.number().int().positive()
  }), "query"),
  async (req, res, next) => {
    try {

      const { volunteerId, occasionId } = req.query;

      const duplicates = await Order.findAll({
        where: {
          volunteerId,
          occasionId
        },
        attributes: ['createdAt', 'amount',],
        include: {
          model: User,
          as: 'user',
          attributes: ['userName'],
        },
      })

      const result = duplicates.map(d => ({
        date: d.createdAt,
        userName: d.user.userName,
        amount: d.amount
      }));


      res.status(200).send({ data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ORDER.CHECKING_FAILED';
      next(error);
    }
  }
);

router.post(
  "/create-order",
  requireAuth,
  requireOperation('ADD_NEW_ORDER'),
  validateRequest(z.object({
    orderDraft: orderSchemas.orderDraftSchema,
    filters: orderSchemas.filterSchema,
  }), 'body'),
  async (req, res, next) => {
    try {
      const { orderDraft, filters } = req.body;

      const result = await withTransaction(async (t) => {
        const duplicates = await Order.findAll({
          where: {
            volunteerId: orderDraft.volunteerId,
            occasionId: orderDraft.occasionId,
          },
          attributes: ['id'],
          include: {
            model: OrderRecipient,
            as: 'orderRecipients',
            attributes: ['recipientId'],
          },
        })
        const contact = await VolunteerContact.findByPk(orderDraft.contactId,
          { transaction: t });
        const restrictedRecipients = duplicates.flatMap(d => d.orderRecipients.map(r => r.recipientId));
        const recipientsList = filters.minFromOneHouse
          ? await createSpecialRecipientsList(orderDraft, filters, restrictedRecipients, t)
          : await createRecipientsList(orderDraft, filters, restrictedRecipients, t);
        console.log("QQQ - recipientsList", recipientsList);

        if (recipientsList.length < orderDraft.amount) return { contact: contact.content, recipients: [] };

        const order = await Order.create(
          orderDraft,
          { transaction: t }
        );
        const orderRecipientsRows = recipientsList.map(r => (
          {
            recipientId: r.id,
            orderId: order.id,
            recipientStatus: 1,
            homeId: r.homeIdSnapshot,
            seniorId: r.seniorId,
          }));
        await OrderRecipient.bulkCreate(orderRecipientsRows, {
          validate: true,
          individualHooks: true,
          transaction: t,
        });

        const recipients = await transformOrderRecipientsPart(order.id, t);
        return { contact: contact.content, recipients };
      });

      res.status(200).send({ code: 'ORDER.CREATED', data: result });
    } catch (error) {
      error.code = 'ERRORS.ORDER.NOT_CREATED';
      next(error);
    }
  }
);

router.post(
  "/get-orders",
  requireAuth,
  requireAny('VIEW_LIMITED_ORDERS_LIST', 'VIEW_FULL_ORDERS_LIST'),
  validateRequest(orderSchemas.orderQueryDTOSchema, 'body'),
  async (req, res, next) => {
    try {
      const {
        offset,
        limit,
        sortField,
        sortOrder,
        searchValue,
        filters
      } = req.body;
      const dir = sortField ? (sortOrder === 1 ? 'ASC' : 'DESC') : 'DESC';
      const lang = req.headers['x-lang'] === 'ru' ? 'ru' : 'en';

      console.log('sortOrder, dir, lang');
      console.log(sortOrder, dir, lang);

      const field = getOrderSortField(sortField);

      const order =
        sortField === 'status'
          ? [
            [getOrderStatusSortExpression(lang), dir],
            ['id', 'ASC'],
          ]
          : sortField === 'source'
            ? [
              [getOrderSourceSortExpression(lang), dir],
              ['id', 'ASC'],
            ]
            : sortField === 'occasionName' ?
              [
                [getOccasionTypeSortExpression(lang), dir],
                [getOccasionMonthSortExpression(lang), dir],
                [{ model: Occasion, as: 'occasion' }, 'year', dir],
                ['id', 'ASC'],
              ]
              : Array.isArray(field)
                ? [[...field, dir], ['id', 'ASC']]
                : [[field, dir], ['id', 'ASC']];

      const where = {};

      if (filters.amount !== undefined) {
        applyNumericFilter(where, filters, 'amount');
      }
      if (filters.comment !== undefined) {
        applyStringFilter(where, filters, 'comment');
      }
      if (filters.userId !== undefined) {
        applyNumericFilter(where, filters, 'userId');
      }
      if (filters.status !== undefined) {
        applyNumericFilter(where, filters, 'status');
      }
      if (filters.source !== undefined) {
        applyNumericFilter(where, filters, 'source');
      }
      if (filters.date !== undefined) {
        applyDateFilter(where, filters, 'date');
      }

      where[Op.and] ??= [];

      if (filters.volunteerName?.[0]?.value) {
        const words = filters.volunteerName[0].value
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        where[Op.and].push(
          ...words.map((word) => ({
            [Op.or]: [
              { '$volunteer.firstName$': { [Op.iLike]: `%${word}%` } },
              { '$volunteer.lastName$': { [Op.iLike]: `%${word}%` } },
              { '$volunteer.patronymic$': { [Op.iLike]: `%${word}%` } },
            ],
          })),
        );
      }

      if (filters.instituteName?.[0]?.value) {
        const words = filters.instituteName[0].value
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        where[Op.and].push(
          ...words.map((word) => ({
            [Op.or]: [
              { '$institute.instituteName$': { [Op.iLike]: `%${word}%` } },
              { '$institute.category$': { [Op.iLike]: `%${word}%` } },
            ],
          })),
        );
      }


      if (filters.contact?.[0]?.value) {
        const words = filters.contact[0].value
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        where[Op.and].push(
          ...words.map((word) => ({
            [Op.or]: [
              { '$contact.content$': { [Op.iLike]: `%${word}%` } },
              { '$contact.type$': { [Op.iLike]: `%${word}%` } },
            ],
          })),
        );
      }

      if (filters.occasionName?.[0]?.value) {

        const filtered = filters.occasionName[0].value.filter(item => {
          const REQUIRED_FIELDS = {
            1: ['month', 'year'],
            2: ['year'],
            3: ['year'],
            4: ['year'],
            5: ['year'],
            6: ['year'],
          };
          const required = REQUIRED_FIELDS[item.type];
          if (!required) return false;

          return required.every(field => item[field] != null);
        });

        where[Op.or] ??= [];

        where[Op.or].push(
          ...filtered.map((node) => ({
            [Op.and]: [
              { '$occasion.type$': node.type },
              { '$occasion.month$': node.month },
              { '$occasion.year$': node.year },
            ],
          })),
        );
      }

      const search = String(searchValue ?? '').trim();
      if (search) {
        where[Op.or] ??= [];
        const value = `%${search.replace(/([_%\\])/g, '\\$1')}%`;
        where[Op.or] = [...where[Op.or],
        { comment: { [Op.iLike]: value } },
        { '$user.userName$': { [Op.iLike]: value } },
        { '$volunteer.firstName$': { [Op.iLike]: value } },
        { '$volunteer.lastName$': { [Op.iLike]: value } },
        { '$volunteer.patronymic$': { [Op.iLike]: value } },
        { '$institute.instituteName$': { [Op.iLike]: value } },
        { '$institute.category$': { [Op.iLike]: value } },
        { '$contact.content$': { [Op.iLike]: value } },
        { '$contact.type$': { [Op.iLike]: value } },
        ];
      }

      const include = [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'userName'],
        },
        {
          model: Volunteer,
          as: 'volunteer',
          attributes: ['id', 'firstName', 'patronymic', 'lastName'],
        },
        {
          model: Institute,
          as: 'institute',
          attributes: ['id', 'instituteName', 'category'],
          required: false,
        },
        {
          model: VolunteerContact,
          as: 'contact',
          attributes: ['id', 'content', 'type'],
          required: false,
        },
        {
          association: 'occasion',
          attributes: ['id', 'type', 'month', 'year', 'amount', 'status'],
        },
      ];

      const total = await Order.count({
        where: where,
        include: include,
        distinct: true,
      });

      const draft = await Order.findAll({
        where: where,
        attributes: {
          exclude: ['updatedAt']
        },
        order,
        include: include,
        offset: offset,
        limit: limit,
        distinct: true,
      });
      const orders = (await Promise.all(
        draft.map(o => transformOrderDisplayPart(o.id))
      )).filter(Boolean);

      const users = await User.findAll({
        attributes: ['id', 'userName'],
        order: [["userName", "ASC"]],
        raw: true,
      });

      const statuses = dictToOptions(ORDER_STATUSES, lang);
      const sources = dictToOptions(ORDER_SOURCES, lang);

      const occasions = await Occasion.findAll(
        {
          attributes: ['id', 'month', 'year', 'type'],
          order: [
            ['type', 'ASC'],
            ['month', 'ASC'],
            ['year', 'ASC'],
          ],
          raw: true,
        }
      );
      const nodes = buildOccasionNodes(
        occasions,
        req.language ?? 'ru',
      );
      res
        .status(200)
        .send({
          data: {
            list: orders, length: total, options: {
              users, statuses, sources, nodes
            }
          }
        });
    } catch (error) {
      error.code = 'ERRORS.ORDER.LIST_FAILED';
      next(error);
    }
  }
);

router.patch(
  "/update-status",
  requireAuth,
  requireAny('EDIT_ORDER'),
  validateRequest(z.object({ id: z.number().int().min(1), status: z.number().int().min(1).max(4) }), 'body'),

  async (req, res, next) => {
    try {
      const { id } = req.body;
      const { status } = req.body;
      await withTransaction(async (t) => {
        const existingOrder = await Order.findByPk(id, { transaction: t });

        if (!existingOrder) {
          throw new CustomError('ERRORS.ORDER.NOT_FOUND', 404);
        }

        if (
          (existingOrder.status === 1 || existingOrder.status === 2)
          && (status === 3 || status === 4)
        ) {
          const recipients = await OrderRecipient.findAll({
            where: {
              orderId: existingOrder.id,
              recipientStatus: { [Op.not]: 3 }
            },
            attributes: ['recipientId'],
            transaction: t,
          });
          const recipientIds = recipients.map((i) => i.recipientId);
          await Recipient.decrement('plusAmount', {
            by: 1,
            where: { id: { [Op.in]: recipientIds } },
            transaction: t,
          });
        }

        if (
          (existingOrder.status === 3 || existingOrder.status === 4)
          && (status === 1)
        ) {
          const recipients = await OrderRecipient.findAll({
            where: {
              orderId: existingOrder.id,
              recipientStatus: { [Op.not]: 3 }
            },
            attributes: ['recipientId'],
            transaction: t,
          });
          const recipientIds = recipients.map((i) => i.recipientId);
          await Recipient.increment('plusAmount', {
            by: 1,
            where: { id: { [Op.in]: recipientIds } },
            transaction: t,
          });
        }

        await existingOrder.update({ status }, { transaction: t });
      }
      );


      res.status(200).send({ code: 'ORDER.UPDATED', data: null });
    } catch (error) {
      error.code = 'ERRORS.ORDER.UPDATE_FAILED';
      next(error);
    }
  });

router.delete(
  "/delete-order/:id",
  requireAuth,
  requireAny('DELETE_ORDER'),
  validateRequest(orderIdParamsSchema, 'params'),

  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        const existingOrder = await Order.findByPk(id, { transaction: t });

        if (!existingOrder) {
          throw new CustomError('ERRORS.ORDER.NOT_FOUND', 404);
        }

        if (existingOrder.status === 1 || existingOrder.status === 2) {
          const recipients = await OrderRecipient.findAll({
            where: {
              orderId: existingOrder.id,
              recipientStatus: { [Op.not]: 3 }
            },
            attributes: ['recipientId'],
            transaction: t,
          });
          const recipientIds = recipients.map((i) => i.recipientId);
          await Recipient.decrement('plusAmount', {
            by: 1,
            where: { id: { [Op.in]: recipientIds } },
            transaction: t,
          });
        }

        if (existingOrder.status === 3 || existingOrder.status === 4) {
          const recipients = await OrderRecipient.findAll({
            where: {
              orderId: existingOrder.id,
              recipientStatus: { [Op.not]: 3 }
            },
            attributes: ['recipientId'],
            transaction: t,
          });
          const recipientIds = recipients.map((i) => i.recipientId);
          await Recipient.increment('plusAmount', {
            by: 1,
            where: { id: { [Op.in]: recipientIds } },
            transaction: t,
          });
        }
        await existingOrder.destroy({ transaction: t });
      }
      );


      res.status(200).send({ code: 'ORDER.UPDATED', data: null });
    } catch (error) {
      error.code = 'ERRORS.ORDER.LIST_FAILED';
      next(error);
    }
  });

router.get(
  "/order/:id",
  requireAuth,
  requireAny('VIEW_ORDER', 'EDIT_ORDER'),
  validateRequest(orderIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const order = await transformOrder(req.params.id);
      if (!order) {
        throw new CustomError('ERRORS.ORDER.NOT_FOUND', 404);
      }

      res.status(200).send({ data: order });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ORDER.UPDATE_FAILED';
      next(error);
    }
  }
);

router.patch(
  "/edit-recipients",
  requireAuth,
  requireAny('EDIT_ORDER'),
  validateRequest(z.object({
    id: z.number().int().min(1),
    deletingIds: z.array(z.number().int().min(1))
  }), 'body'),

  async (req, res, next) => {
    try {
      const { id, deletingIds } = req.body;
      console.log('deletingIds', deletingIds);

      await withTransaction(async (t) => {
        const existingOrder = await Order.findByPk(id, {
          transaction: t,
        });

        if (!existingOrder) {
          throw new CustomError('ERRORS.ORDER.NOT_FOUND', 404);
        }

        const recipients = await OrderRecipient.findAll({
          where: {
            id: { [Op.in]: deletingIds }
          },
          attributes: ['recipientId'],
          transaction: t,
        });
        if (recipients.length === 0) throw new CustomError('ERRORS.RECIPIENTS.NOT_FOUND', 404);

        await OrderRecipient.update(
          { recipientStatus: 3 }, {
          where: {
            id: { [Op.in]: deletingIds }
          },
          transaction: t
        }
        );

        const recipientIds = recipients.map((i) => i.recipientId);
        await Recipient.decrement('plusAmount', {
          by: 1,
          where: { id: { [Op.in]: recipientIds } },
          transaction: t,
        });

        await existingOrder.update(
          { amount: existingOrder.amount - recipientIds.length },
          { transaction: t }
        );


      }
      );
      const order = await transformOrder(id);

      res.status(200).send({ code: 'ORDER.UPDATED', data: order });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ORDER.GET_FAILED';
      next(error);
    }
  });

/* router.put(
  "/:id",
  requireAuth,
  requireOperation('EDIT_ORDER'),
  validateRequest(orderIdParamsSchema, 'params'),
  validateRequest(orderSchemas.orderEditSchema, 'body'),
  async (req, res, next) => {
    try {
      const order = await withTransaction(async (t) => {
        const existingOrder = await Order.findByPk(req.params.id, {
          transaction: t,
        });

        if (!existingOrder) {
          throw new CustomError('ERRORS.ORDER.NOT_FOUND', 404);
        }

        await existingOrder.update(req.body, { transaction: t });
        return transformOrder(existingOrder.id, t);
      });

      res.status(200).send({ code: 'ORDER.UPDATED', data: order });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ORDER.UPDATE_FAILED';
      next(error);
    }
  }
); */

export default router;
