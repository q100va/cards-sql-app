import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CustomError from '../shared/customError.js';
import { downloadQuery } from '../../shared/dist/schemas/file.schema.js';
import requireAuth from '../middlewares/check-auth.js';
import { requireOperation } from '../middlewares/require-permission.js';
import { validateRequest } from '../middlewares/validate-request.js';

const router = Router();
const templateDirectory = fileURLToPath(new URL('../protected-templates/', import.meta.url));
const templatePermissions = new Map([
  ['template-countries.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-regions.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-districts.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-localities.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-seniors.xlsx', 'DOWNLOAD_TEMPLATE_FOR_SENIOR'],
]);

router.get(
  '/download/:filename',
  requireAuth,
  validateRequest(downloadQuery, 'params'),
  (req, res, next) => {
    const operation = templatePermissions.get(req.params.filename);
    if (!operation) return next(new CustomError('ERRORS.FILE.NOT_FOUND', 404));
    return requireOperation(operation)(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const filePath = path.join(templateDirectory, filename);

      // Verify that the requested path points to an existing file.
      let stat;

      try {
        stat = await fs.stat(filePath);
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
          throw new CustomError('ERRORS.FILE.NOT_FOUND', 404);
        }
        throw error;
      }

      if (!stat.isFile()) {
        throw new CustomError('ERRORS.FILE.NOT_FOUND', 404);
      }

      res.setHeader('Cache-Control', 'no-store');

      res.download(filePath, filename, (error) => {
        if (error) {
          error.status = error.statusCode ?? 500;
          error.code = error.code ?? 'ERRORS.FILE.DOWNLOAD_FAILED';
          next(error);
        }
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.FILE.DOWNLOAD_FAILED';
      next(error);
    }
  }
);

export default router;

