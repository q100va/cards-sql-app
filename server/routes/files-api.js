import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import requireAuth from '../middlewares/check-auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { downloadQuery } from '../../shared/dist/file.schema.js';
import CustomError from '../shared/customError.js';
import { requireOperation } from '../middlewares/require-permission.js';

const router = Router();

router.get(
  '/download/:filename',
  requireAuth,
  requireOperation('DOWNLOAD_TEMPLATE_FOR_TOPONYM'),
  validateRequest(downloadQuery, 'params'),
  async (req, res, next) => {
    try {
      const { filename } = req.params;

      const PUBLIC_DIR = path.resolve(__basedir, '../public');
      const filePath = path.resolve(PUBLIC_DIR, filename);

      const rel = path.relative(PUBLIC_DIR, filePath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new CustomError('ERRORS.FILE.INVALID_PATH', 400);
      }

      let stat;
      try {
        stat = await fs.stat(filePath);
      } catch {
        throw new CustomError('ERRORS.FILE.NOT_FOUND', 404);
      }
      if (!stat.isFile()) {
        throw new CustomError('ERRORS.FILE.NOT_FOUND', 404);
      }

      const asciiName = filename.replace(/[^\x20-\x7E]/g, '_');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.setHeader('Cache-Control', 'no-store');

      res.download(filePath, (e) => {
        if (e) {
          e.status = e.statusCode ?? 500;
          e.code = e.code ?? 'ERRORS.FILE.DOWNLOAD_FAILED';
          return next(e);
        }
      });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.FILE.DOWNLOAD_FAILED';
      return next(error);
    }
  }
);

export default router;

