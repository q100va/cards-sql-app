import { Router } from "express";
import { Op, Sequelize } from 'sequelize';
import { z } from 'zod';
import {
  Order, Region, Home, HomeAddress, OrderRecipient,
  VolunteerAddress, Volunteer, VolunteerContact, VolunteerSearch, VolunteerOutdatedName,
  VolunteerSubscription, VolunteerCooperation, Institute,
  User
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as volunteerSchemas from "../../shared/dist/schemas/volunteer.schema.js";
import { createRecipientsList } from "../controllers/ctrl-create-order.js";
import * as orderSchemas from "../../shared/dist/schemas/order.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { createSpecialRecipientsList } from "../controllers/ctrl-create-special-order.js";
import { transformOrderRecipientsPart } from "../controllers/ctrl-transform-order.js";

const router = Router();

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

export default router;

