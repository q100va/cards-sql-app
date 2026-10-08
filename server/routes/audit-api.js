import { Router } from 'express';
import { Op } from 'sequelize';

import { AuditLog } from '../models/index.js';
import requireAuth from '../middlewares/check-auth.js';
import { requireOperation } from '../middlewares/require-permission.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  auditQuerySchema,
} from '../../shared/dist/schemas/audit.schema.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireOperation('VIEW_AUDIT_LOG'),
  validateRequest(
    auditQuerySchema,
    'query',
  ),
  async (req, res, next) => {
    try {
      const {
        model,
        action,
        entityId,
        userId,
        correlationId,
        from,
        to,
        limit,
        offset,
      } = req.query;

      // Build filters from validated query parameters.
      const where = {};

      if (model) {
        where.model = model;
      }

      if (entityId) {
        where.entityId = entityId;
      }

      if (action) {
        where.action = action;
      }

      if (correlationId) {
        where.correlationId =
          correlationId;
      }

      if (userId !== undefined) {
        where.actorUserId = userId;
      }

      if (from || to) {
        where.createdAt = {
          ...(from
            ? { [Op.gte]: from }
            : {}),
          ...(to
            ? { [Op.lte]: to }
            : {}),
        };
      }

      // Fetch records and total count in parallel.
      const [rows, total] =
        await Promise.all([
          AuditLog.findAll({
            where,
            order: [
              ['createdAt', 'DESC'],
              ['id', 'DESC'],
            ],
            limit,
            offset,
            raw: true,
          }),

          AuditLog.count({
            where,
          }),
        ]);

      return res
        .status(200)
        .send({
          data: {
            rows,
            count: total,
          },
        });
    } catch (error) {
      error.code =
        error.code ??
        'ERRORS.DATA_FETCH_FAILED';

      next(error);
    }
  },
);

export default router;
