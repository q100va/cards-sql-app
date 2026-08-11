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
        return res.status(401).send({ code: 'ERRORS.UNAUTHORIZED', data: null });
      }

      // Fetch permissions assigned to the current user's role.
      const rows = await RolePermission.findAll({
        where: { roleId },
        attributes: ['id', 'name', 'access', 'disabled', 'roleId'],
        order: [['name', 'ASC']],
        raw: true,
      });

      // Map database fields to the API response format.
      const list = rows.map(r => ({
        id: r.id,
        operation: r.name,
        access: r.access,
        disabled: r.disabled,
        roleId: r.roleId
      }));

      res.status(200).send({ data: list });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);
export default router;
