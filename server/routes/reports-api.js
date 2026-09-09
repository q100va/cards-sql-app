import { Router } from 'express';
import { Op } from 'sequelize';

import {
  Order,
  OrderRecipient,
  Institute,
  Occasion,
  Recipient,
} from '../models/index.js';

import requireAuth from '../middlewares/check-auth.js';
import {
  requireOperation,
  requireAny,
} from '../middlewares/require-permission.js';
import { validateRequest } from '../middlewares/validate-request.js';

import * as reportSchemas from '../../shared/dist/schemas/report.schema.js';

import {
  COLUMNS,
  REPORT_TYPE,
} from '../../shared/dist/constants/reports.js';

import {
  ORDER_STATUS,
  ORDER_RECIPIENT_STATUS,
} from '../../shared/dist/constants/orders.js';

import {
  OCCASION_STATUS,
} from '../../shared/dist/constants/occasions.js';

import {
  getSelectedDateRanges,
  getReportByPeriods,
  getReportByOccasion,
  getStatistic,
} from '../controllers/ctrl-generate-reports.js';


const router = Router();

const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.ACCEPTED,
];

const ACTIVE_RECIPIENT_STATUSES = [
  ORDER_RECIPIENT_STATUS.PRESENT,
  ORDER_RECIPIENT_STATUS.ABSENT,
];

router.post("/get-report",
  requireAuth,
  requireAny('VIEW_LIMITED_REPORTS', 'VIEW_FULL_REPORTS'),
  validateRequest(reportSchemas.reportDTOSchema, "body"),
  async (req, res, next) => {
    try {
      const { userId, type, frequency, months, quarters, years } = req.body;
      const where = {};
      if (userId) where.userId = userId;

      if (
        type === REPORT_TYPE.GENERAL ||
        type === REPORT_TYPE.BY_OCCASION
      ) {
        where.status = {
          [Op.in]: ACTIVE_ORDER_STATUSES,
        };
      }

      let include = [];
      if (type === REPORT_TYPE.GENERAL ||
        type === REPORT_TYPE.BY_OCCASION) {
        include = [
          {
            model: OrderRecipient,
            as: 'orderRecipients',
            where: {
              recipientStatus: {
                [Op.in]: ACTIVE_RECIPIENT_STATUSES,
              },
            },
            required: true,
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
          },
          {
            model: Institute,
            as: 'institute',
            attributes: [
              'category'
            ],
          }
        ];
      }
      if (type === REPORT_TYPE.PERSONAL) {
        include = [
          {
            model: OrderRecipient,
            as: 'orderRecipients',
            where: {
              recipientStatus: {
                [Op.in]: ACTIVE_RECIPIENT_STATUSES,
              },
            },
            required: true,
            attributes: ['seniorId'],
          },
        ];
      }

      if (type === REPORT_TYPE.SCHOOL_COORDINATION) {
        include = [
          {
            model: Institute,
            as: 'institute',
            attributes: ['createdAt'],
          },
        ];
      }
      let fullWhere = {};

      if (type === REPORT_TYPE.BY_OCCASION) {
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
      });

      const report =
        type === REPORT_TYPE.BY_OCCASION
          ? getReportByOccasion(orders)
          : getReportByPeriods(
            type,
            orders,
            frequency,
          );
      const cols = COLUMNS[type];

      res.status(200).send({ data: { type, report, cols } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.REPORT_GENERATE_FAILED';
      next(error);
    }
  }
);

router.get("/get-statistic",
  requireAuth,
  requireOperation('VIEW_CURRENT_STATISTIC'),
  async (req, res, next) => {
    try {
      const recipients = await Recipient.findAll({
        where: {
          isAbsent: false,
          '$occasion.status$': OCCASION_STATUS.OPEN
        },
        include: [
          {
            model: Occasion,
            as: 'occasion',
            attributes: ['type', 'month', 'year', 'status']
          }
        ]
      });

      const report = getStatistic(recipients);

      const cols = COLUMNS[REPORT_TYPE.CURRENT_STATISTIC];

      res.status(200).send({ data: { report, cols } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.REPORT_GENERATE_FAILED';
      next(error);
    }
  }
);

export default router;
