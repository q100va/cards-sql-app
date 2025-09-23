// server/routes/auth-api.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/check-auth.js';
import {RolePermission} from '../models/index.js';

const router = Router();
router.get(
  '/permissions',
  requireAuth,
  async (req, res, next) => {
    try {
      // console.log('SERSER!!! req.user', req.user)
      const roleId = req.user?.roleId;
      if (!roleId) {
        return res.status(401).send({ code: 'ERRORS.UNAUTHORIZED', data: null });
      }
      const rows = await RolePermission.findAll({
        where: { roleId },
        attributes: ['id', 'name', 'access', 'disabled', 'roleId'],
        order: [['name', 'ASC']],
        raw: true,
      });

      const list = rows.map(r => ({
        id: r.id,
        operation: r.name,
        access: r.access,
        disabled: r.disabled,
        roleId: r.roleId
      }));

      // console.log('list', list);
      res.status(200).send({ data: list });
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Permissions fetch failed');
      return next(Object.assign(e, { code: 'ERRORS.NO_DATA_RECEIVED' }));

    }
  }
);
export default router;
