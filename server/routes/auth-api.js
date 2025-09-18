// server/routes/auth-api.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/check-auth.js';
import RolePermission from '../models/role-permission.js';

const router = Router();
router.get(
  '/permissions',
  requireAuth,
  async (req, res, next) => {
    try {
     // console.log('SERSER!!! req.user', req.user)
      const roleId = req.user?.roleId;
      const rows = await RolePermission.findAll({
        where: { roleId },
        attributes: ['id', 'name', 'access', 'disabled', 'roleId'],
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
      err.code = 'ERRORS.NO_DATA_RECEIVED';
      return next(err);
    }
  }
);
export default router;
