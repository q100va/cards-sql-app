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
import * as reportSchemas from "../../shared/dist/schemas/report.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { col, fn } from 'sequelize';
import { COLUMNS, getSelectedDateRanges, getReportByPeriods, getReportByOccasion } from "../controllers/ctrl-generate-reports.js";


const router = Router();

router.post("/get-report",
  requireAuth,
  requireAny('VIEW_LIMITED_REPORTS', 'VIEW_FULL_REPORTS'),
  validateRequest(reportSchemas.reportDTOSchema, "body"),
  async (req, res, next) => {
    try {
      const { userId, type, frequency, months, quarters, years } = req.body;
      console.log('req.body', req.body);
      const where = {};
      if (userId) where.userId = userId;

      if (type === 1 || type === 4) where.status = { [Op.in]: [1, 2] };

      let include = [];
      if (type === 1 || type === 4) {
        include = [
          {
            model: OrderRecipient,
            as: 'orderRecipients',
            attributes: ['homeId', 'seniorId'],
            include: [
              {
                model: Recipient,
                as: 'recipient',
                attributes: [
                  'regionIdSnapshot',
                ],
              },]
          },
          {
            model: Occasion,
            as: 'occasion',
            attributes: [
              'type', 'month', 'year',
            ],
          }
        ];
      }
      if (type === 2) {
        include = [
          {
            model: OrderRecipient,
            as: 'orderRecipients',
            attributes: ['seniorId'],
          },
        ];
      }
      let fullWhere = {};

      if (type === 4) {
        fullWhere = {
          [Op.and]: [
            where,
            {
              '$occasion.year$': { [Op.in]: years }
            },
          ],
        };
      } else {
        const dateRanges = getSelectedDateRanges({ frequency, months, quarters, years });

        if (dateRanges.length === 0) {
          throw new CustomError('ERRORS.REPORTS.INVALID_REQUEST', 422);
        }

        const periodConditions = dateRanges.map(({ startDate, endDate }) => ({
          createdAt: {
            [Op.gte]: startDate,
            [Op.lt]: endDate,
          },
        }));

        fullWhere = {
          [Op.and]: [
            where,
            {
              [Op.or]: periodConditions,
            },
          ],
        };
      }



      const orders = await Order.findAll({
        where: fullWhere,
        include,
        order: [['createdAt', 'ASC']],
        //raw: true,
      });
      //console.log('ORDERS', orders);
      //console.dir(orders, { depth: null });

      const report = type === 4 ? getReportByOccasion(orders) : getReportByPeriods(type, orders, frequency);
      const cols = COLUMNS[type]();

      res.status(200).send({ data: { type, report, cols } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ORDER.FILTER_DATA_FAILED';
      next(error);
    }
  }
);

export default router;


/*
const yearExpression = fn('DATE_PART', 'year', col('createdAt'));
      const quarterExpression = fn('DATE_PART', 'quarter', col('createdAt'));
      const monthExpression = fn('DATE_PART', 'month', col('createdAt'));
let include = [];
      let order = [['createdAt', 'ASC']];

      if (frequency === 'ANNUAL') {
        include = [[yearExpression, 'year']];
        order = [
          [yearExpression, 'ASC'],
          ['createdAt', 'ASC'],
        ];
      }

      if (frequency === 'MONTHLY') {
        include = [
          [yearExpression, 'year'],
          [monthExpression, 'month'],
        ];
        order = [
          [yearExpression, 'ASC'],
          [monthExpression, 'ASC'],
          ['createdAt', 'ASC'],
        ];
      }

      if (frequency === 'QUARTERLY') {
        include = [
          [yearExpression, 'year'],
          [quarterExpression, 'quarter'],
        ];
        order = [
          [yearExpression, 'ASC'],
          [quarterExpression, 'ASC'],
          ['createdAt', 'ASC'],
        ];
      }

      const orders = await Order.findAll({
        attributes: {
          include,
        },
        where,
        order,
        raw: true,
      }); */
