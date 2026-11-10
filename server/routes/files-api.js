import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import CustomError from '../shared/customError.js';
import { downloadQuery } from '../../shared/dist/schemas/file.schema.js';
import requireAuth from '../middlewares/check-auth.js';
import { requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from '../middlewares/validate-request.js';

const router = Router();

router.get(
  '/download/:filename',
  requireAuth,
  requireAny(
    'DOWNLOAD_TEMPLATE_FOR_TOPONYM',
    'DOWNLOAD_TEMPLATE_FOR_SENIORS',
    'DOWNLOAD_HOMES_TABLE'),
  validateRequest(downloadQuery, 'params'),
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const publicDir = path.resolve(__basedir, '../public');
      const filePath = path.resolve(publicDir, filename);

      // Prevent access outside the public directory.
      const relativePath = path.relative(publicDir, filePath);

      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new CustomError('ERRORS.FILE.INVALID_PATH', 400);
      }

      // Verify that the requested path points to an existing file.
      let stat;

      try {
        stat = await fs.stat(filePath);
      } catch {
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

