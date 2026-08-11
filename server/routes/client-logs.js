import { Router } from 'express';
import logger from '../logging/logger.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { clientLogBatchSchema } from '../../shared/dist/schemas/client-log.schema.js';

const router = Router();

router.post(
  '/',
  validateRequest(clientLogBatchSchema, 'body'),
  (req, res, next) => {
    try {
      const batch = req.body;

      // Forward validated client logs to the server logger.
      for (const item of batch.items) {
        const entry = {
          client: true,
          app: batch.app,
          env: batch.env,
          ts: item.ts,
          sessionId: item.sessionId,
          corrId: item.corrId ?? null,
          userId: item.userId ?? null,
          pageUrl: item.pageUrl,
          route: item.route,
          userAgent: item.userAgent,
          context: item.context,
          stack: item.stack,
        };

        if (item.level === 'error') {
          logger.error(entry, item.message);
        } else {
          logger.warn(entry, item.message);
        }
      }

      res.status(204).send();
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_SAVE_FAILED';
      next(error);
    }
  },
);

export default router;

//TODO: add rate limit
