import { Router } from "express";
import { Op } from 'sequelize';
import { AuditLog } from "../models/index.js";
import { auditQuerySchema } from "../../shared/dist/schemas/audit.schema.js";
import { validateRequest } from "../middlewares/validate-request.js";
import { requireOperation } from "../middlewares/require-permission.js";
import requireAuth from "../middlewares/check-auth.js";
const router = Router();

router.get(
  '/',
  requireAuth,
  requireOperation('VIEW_AUDIT_LOG'),
  validateRequest(auditQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { model, action, entityId, userId, correlationId, from, to } = req.query;
      const limit = Math.min(Number(req.query.limit) || 10, 100);
      const offset = Number(req.query.offset) || 0;

      // Build filters from provided query parameters.
      const where = {};
      if (model) where.model = String(model);
      if (entityId) where.entityId = String(entityId);
      if (action) where.action = String(action);
      if (correlationId) where.correlationId = String(correlationId);
      if (userId) where.actorUserId = String(userId);
      if (from || to) where.createdAt = {
        ...(from ? { [Op.gte]: new Date(String(from)) } : {}),
        ...(to ? { [Op.lte]: new Date(String(to)) } : {}),
      };

      // Fetch records and total count in parallel.
      const [rows, total] = await Promise.all([
        AuditLog.findAll({
          where,
          order: [['createdAt', 'DESC'], ['id', 'DESC']],
          limit,
          offset,
          raw: true,
        }),
        AuditLog.count({ where }),
      ]);

      res.status(200).send({ data: { rows, count: total } });

    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  });

export default router;


