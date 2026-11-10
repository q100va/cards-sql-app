import { Router } from 'express';
import { RolePermission } from '../models/index.js';
import { requireAuth } from '../middlewares/check-auth.js';

const router = Router();

router.get(
  '/permissions',
  requireAuth,
  async (req, res, next) => {
    try {
      const roleId = req.user?.roleId;

      if (!roleId) {
        return res.status(401).send({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      const rows = await RolePermission.findAll({
        where: { roleId },
        attributes: [
          'id',
          'name',
          'access',
          'disabled',
          'roleId',
        ],
        order: [['name', 'ASC']],
        raw: true,
      });

      const list = rows.map((row) => ({
        id: row.id,
        operation: row.name,
        access: row.access,
        disabled: row.disabled,
        roleId: row.roleId,
      }));

      return res.status(200).send({
        data: list,
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
