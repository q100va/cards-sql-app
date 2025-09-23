import { Router } from "express";
import Sequelize from "sequelize";
import { validateRequest } from "../middlewares/validate-request.js";
import { auditQuerySchema } from "../../shared/dist/audit.schema.js";
import { AuditLog } from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireAny, requireOperation } from "../middlewares/require-permission.js";

const Op = Sequelize.Op;
const router = Router();
router.get(
  '/',
  requireAuth,
  requireOperation('VIEW_FULL_ROLES_LIST'),
  validateRequest(auditQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { model, action, entityId, userId, correlationId, from, to } = req.query;

      const limit = Math.min(Number(req.query.limit) || 10, 100);
      const offset = Number(req.query.offset) || 0;
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

    } catch (err) {
      err.code = 'ERRORS.NO_DATA_RECEIVED';
      next(err);
    }
  });

export default router;


