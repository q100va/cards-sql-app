// server/middlewares/require-operation.js
import { Op } from 'sequelize';
import RolePermission from '../models/role-permission.js';

function unauth() {
  return Object.assign(new Error('Unauthorized'), { status: 401, code: 'ERRORS.UNAUTHORIZED' });
}
function forbidden(details) {
  return Object.assign(new Error('Forbidden'), { status: 403, code: 'ERRORS.FORBIDDEN', details });
}

/** Требует хотя бы ОДНУ операцию (OR) */
export function requireAny(...opCodes) {
  // dedupe на всякий
  const codes = [...new Set(opCodes)];
  return async (req, _res, next) => {
    try {
      const roleId = req.user?.roleId;
      if (!roleId) return next(unauth());

      const count = await RolePermission.count({
        where: { roleId, name: { [Op.in]: codes }, access: true },
      });

      if (count >= 1) return next();
      return next(forbidden({ requiredAny: codes }));
    } catch (e) {
      return next(forbidden({ error: 'ACCESS.CHECK_FAILED', cause: e?.message }));
    }
  };
}

/** Требует ВСЕ перечисленные операции (AND) */
export function requireAll(...opCodes) {
  const codes = [...new Set(opCodes)];
  return async (req, _res, next) => {
    try {
      const roleId = req.user?.roleId;
      if (!roleId) return next(unauth());

      const rows = await RolePermission.findAll({
        where: { roleId, name: { [Op.in]: codes }, access: true },
        attributes: ['name'],
        raw: true,
      });
      const have = new Set(rows.map(r => r.name));
      const missing = codes.filter(c => !have.has(c));

      if (missing.length === 0) return next();
      return next(forbidden({ requiredAll: codes, missing }));
    } catch (e) {
      return next(forbidden({ error: 'ACCESS.CHECK_FAILED', cause: e?.message }));
    }
  };
}

/** Для простого случая одной операции (сugar) */
export const requireOperation = (opCode) => requireAll(opCode);
