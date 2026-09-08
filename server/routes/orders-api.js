import { Router } from "express";
import { Op } from 'sequelize';
import {
  Order, Region, Home, HomeAddress, OrderRecipient,
  VolunteerContact,
  User, Occasion,
  Recipient
} from "../models/index.js";
import CustomError from "../shared/customError.js";
import * as orderSchemas from "../../shared/dist/schemas/order.schema.js";
import {
  ORDER_STATUSES,
  ORDER_SOURCES,
  ORDER_STATUS,
  ORDER_RECIPIENT_STATUS,
} from '../../shared/dist/constants/orders.js';
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { createRecipientsListForOrder } from "../controllers/ctrl-create-order.js";
import { createSpecialRecipientsListForOrder } from "../controllers/ctrl-create-special-order.js";
import { transformOrder, transformOrderDisplayPart, transformOrderRecipientsPart } from "../controllers/ctrl-transform-order.js";
import { applyOrderFilters, buildOrderSort, dictToOptions, ORDER_LIST_INCLUDE } from "../controllers/ctrl-order-query-builders.js";
import { buildOccasionNodes } from "../controllers/ctrl-build-occasion-nodes.js";


const router = Router();

async function getOrderDetails(id, t = null) {
  const order = await Order.findByPk(id, {
    attributes: {
      exclude: ['updatedAt'],
    },
    include: ORDER_LIST_INCLUDE,
    ...(t && { transaction: t }),
  });

  if (!order) {
    throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
  }

  return transformOrder(order, t);
}

router.get("/get-filters-data",
  requireAuth,
  requireOperation('ADD_NEW_ORDER'),
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

      homes = homes.map(h => ({
        id: h.id,
        name: h.homeName,
        regionId: h['activeAddress.regionId']
      }));

      res.status(200).send({ data: { regions, homes } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.get("/check-order",
  requireAuth,
  requireOperation('ADD_NEW_ORDER'),
  validateRequest(orderSchemas.orderDataSchema, "query"),
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
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  }
);

router.post(
  "/create-order",
  requireAuth,
  requireOperation('ADD_NEW_ORDER'),
  validateRequest(orderSchemas.orderCreateSchema, 'body'),
  async (req, res, next) => {
    try {
      const { orderDraft, filters } = req.body;

      const result = await withTransaction(async (t) => {
        const duplicates = await Order.findAll({
          where: {
            volunteerId: orderDraft.volunteerId,
            occasionId: orderDraft.occasionId,
          },
          transaction: t,
          attributes: ['id'],
          include: {
            model: OrderRecipient,
            as: 'orderRecipients',
            attributes: ['recipientId'],
          },
        });

        const contact = await VolunteerContact.findByPk(
          orderDraft.contactId,
          { transaction: t },
        );
        if (!contact) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }

        const restrictedRecipients = duplicates.flatMap(d => d.orderRecipients.map(r => r.recipientId));
        const recipientsList = filters.minFromOneHouse
          ? await createSpecialRecipientsListForOrder(orderDraft, filters, restrictedRecipients, t)
          : await createRecipientsListForOrder(orderDraft, filters, restrictedRecipients, t);

        if (recipientsList.length < orderDraft.amount) return { contact: contact.content, recipients: [] };

        const order = await Order.create(
          orderDraft,
          { transaction: t }
        );
        const orderRecipientsRows = recipientsList.map(r => (
          {
            recipientId: r.id,
            orderId: order.id,
            recipientStatus: ORDER_RECIPIENT_STATUS.PRESENT,
            homeId: r.homeIdSnapshot,
            seniorId: r.seniorId,
          }));
        await OrderRecipient.bulkCreate(orderRecipientsRows, {
          validate: true,
          individualHooks: true,
          transaction: t,
        });

        const recipients = await transformOrderRecipientsPart(order, t);
        return { contact: contact.content, recipients };
      });

      res.status(200).send({ data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
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

      const lang = req.headers['x-lang'] === 'ru' ? 'ru' : 'en';

      const order = buildOrderSort(
        sortField,
        sortOrder,
        lang,
      );

      const where = {};

      applyOrderFilters(
        where,
        filters,
        searchValue,
      );

      const include = ORDER_LIST_INCLUDE;

      const [
        total,
        draft,
        users,
        occasions,
      ] = await Promise.all([
        Order.count({
          where,
          include,
          distinct: true,
        }),

        Order.findAll({
          where,
          attributes: {
            exclude: ['updatedAt'],
          },
          order,
          include,
          offset,
          limit,
          distinct: true,
        }),

        User.findAll({
          attributes: ['id', 'userName'],
          order: [['userName', 'ASC']],
          raw: true,
        }),

        Occasion.findAll({
          attributes: ['id', 'month', 'year', 'type'],
          order: [
            ['type', 'ASC'],
            ['month', 'ASC'],
            ['year', 'ASC'],
          ],
          raw: true,
        }),
      ]);

      const orders = draft.map(order => transformOrderDisplayPart(order));

      const statuses = dictToOptions(ORDER_STATUSES, lang);
      const sources = dictToOptions(ORDER_SOURCES, lang);
      const nodes = buildOccasionNodes(
        occasions,
        lang,
      );

      res.status(200).send({
        data: {
          list: orders,
          length: total,
          options: {
            users,
            statuses,
            sources,
            nodes,
          },
        },
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  });

router.patch(
  "/update-status",
  requireAuth,
  requireOperation('EDIT_ORDER'),
  validateRequest(orderSchemas.orderStatusUpdateSchema, 'body'),

  async (req, res, next) => {
    try {
      const { id, status } = req.body;
      await withTransaction(async (t) => {
        const existingOrder = await Order.findByPk(id, { transaction: t });

        if (!existingOrder) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }

        if (
          (
            existingOrder.status === ORDER_STATUS.PENDING ||
            existingOrder.status === ORDER_STATUS.ACCEPTED
          ) &&
          (
            status === ORDER_STATUS.RETURNED ||
            status === ORDER_STATUS.OVERDUE
          )
        ) {
          const recipients = await OrderRecipient.findAll({
            where: {
              orderId: existingOrder.id,
              recipientStatus: {
                [Op.not]: ORDER_RECIPIENT_STATUS.DELETED,
              },
            },
            attributes: ['recipientId'],
            transaction: t,
          });

          const recipientIds = recipients.map(
            (recipient) => recipient.recipientId,
          );

          await Recipient.decrement('plusAmount', {
            by: 1,
            where: {
              id: {
                [Op.in]: recipientIds,
              },
            },
            transaction: t,
          });
        }

        if (
          (
            existingOrder.status === ORDER_STATUS.RETURNED ||
            existingOrder.status === ORDER_STATUS.OVERDUE
          ) &&
          (
            status === ORDER_STATUS.PENDING ||
            status === ORDER_STATUS.ACCEPTED
          )
        ) {
          const recipients = await OrderRecipient.findAll({
            where: {
              orderId: existingOrder.id,
              recipientStatus: {
                [Op.not]: ORDER_RECIPIENT_STATUS.DELETED,
              },
            },
            attributes: ['recipientId'],
            transaction: t,
          });

          const recipientIds = recipients.map(
            (recipient) => recipient.recipientId,
          );

          await Recipient.increment('plusAmount', {
            by: 1,
            where: {
              id: {
                [Op.in]: recipientIds,
              },
            },
            transaction: t,
          });
        }

        await existingOrder.update({ status }, { transaction: t });
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  });

router.delete(
  "/delete-order/:id",
  requireAuth,
  requireOperation('DELETE_ORDER'),
  validateRequest(orderSchemas.orderIdParamsSchema, 'params'),

  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        const existingOrder = await Order.findByPk(id, { transaction: t });

        if (!existingOrder) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }

        if (
          existingOrder.status === ORDER_STATUS.PENDING ||
          existingOrder.status === ORDER_STATUS.ACCEPTED
        ) {
          const recipients = await OrderRecipient.findAll({
            where: {
              orderId: existingOrder.id,
              recipientStatus: {
                [Op.not]: ORDER_RECIPIENT_STATUS.DELETED,
              },
            },
            attributes: ['recipientId'],
            transaction: t,
          });

          const recipientIds = recipients.map(
            (recipient) => recipient.recipientId,
          );

          await Recipient.decrement('plusAmount', {
            by: 1,
            where: {
              id: {
                [Op.in]: recipientIds,
              },
            },
            transaction: t,
          });
        }
        await existingOrder.destroy({ transaction: t });
      });

      res.status(200).send({ code: 'SUCCESS.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_DELETE_FAILED';
      next(error);
    }
  });

router.get(
  "/order/:id",
  requireAuth,
  requireAny('VIEW_ORDER', 'EDIT_ORDER'),
  validateRequest(orderSchemas.orderIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const order = await getOrderDetails(req.params.id);
      res.status(200).send({ data: order });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.patch(
  "/edit-recipients",
  requireAuth,
  requireOperation('EDIT_ORDER'),
  validateRequest(orderSchemas.orderEditRecipientsSchema, 'body'),

  async (req, res, next) => {
    try {
      const { id, deletingIds } = req.body;

      await withTransaction(async (t) => {
        const existingOrder = await Order.findByPk(id, {
          transaction: t,
        });

        if (!existingOrder) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }

        const recipients = await OrderRecipient.findAll({
          where: {
            id: {
              [Op.in]: deletingIds,
            },
            orderId: id,
            recipientStatus: {
              [Op.ne]: ORDER_RECIPIENT_STATUS.DELETED,
            },
          },
          attributes: ['id', 'recipientId'],
          transaction: t,
        });
        if (recipients.length !== deletingIds.length) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }
        if (existingOrder.amount - recipients.length < 1) {
          throw new CustomError(
            'ERRORS.ORDER.MIN_RECIPIENTS',
            409,
          );
        }

        await OrderRecipient.update(
          {
            recipientStatus: ORDER_RECIPIENT_STATUS.DELETED,
          },
          {
            where: {
              id: {
                [Op.in]: deletingIds,
              },
              orderId: id,
              recipientStatus: {
                [Op.ne]: ORDER_RECIPIENT_STATUS.DELETED,
              },
            },
            transaction: t,
          },
        );

        const recipientIds = recipients.map(
          (recipient) => recipient.recipientId,
        );
        if (
          existingOrder.status === ORDER_STATUS.PENDING ||
          existingOrder.status === ORDER_STATUS.ACCEPTED
        ) {
          await Recipient.decrement('plusAmount', {
            by: 1,
            where: { id: { [Op.in]: recipientIds } },
            transaction: t,
          });
        }

        await existingOrder.update(
          { amount: existingOrder.amount - recipientIds.length },
          { transaction: t }
        );
      });

      const order = await getOrderDetails(id);

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: order });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  });

export default router;
