import { Router } from 'express';
import logger from '../logging/logger.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { clientLogBatchSchema } from '../../shared/dist/client-log.schema.js';

const router = Router();

router.post(
  '/',
  validateRequest(clientLogBatchSchema, 'body'),
  async (req, res, next) => {
    try {
      const batch = req.body; // уже валидно
     // logger.debug(batch, `Принято`);
      // простой приём: пишем каждую запись в Pino (уровни сохраняем)
      for (const it of batch.items) {
        const entry = {
          client: true,
          app: batch.app,
          env: batch.env,
          ts: it.ts,
          sessionId: it.sessionId,
          corrId: it.corrId ?? null,
          userId: it.userId ?? null,
          pageUrl: it.pageUrl,
          route: it.route,
          userAgent: it.userAgent,
          context: it.context,
          stack: it.stack,
        };
        if (it.level === 'error') logger.error(entry, it.message);
        else logger.warn(entry, it.message);
      }
      // TODO (опционально): складывать в таблицу client_logs
      res.status(204).send();
    } catch (err) {
      err.userMessage = 'Не удалось принять логи клиента.';
      return next(err);
    }
  }
);

export default router;
