// validate-request.js
import { z } from 'zod';

export function validateRequest(schema, part = 'body'/* , opts = {} */) {
  return (req, _res, next) => {
    try {
      const parsed = schema.safeParse(req[part]);

      if (!parsed.success) {
        const details = z.treeifyError(parsed.error);

        const err = new Error('Request validation failed');
        err.status = 422;
        err.code = 'ERRORS.VALIDATION';
        err.details = details;
        return next(err);
      }

      req[part] = parsed.data;
      next();
    } catch (error) {
      // ← здесь добавляем код и статус для рантайм-исключений в валидаторе
      const err = error instanceof Error ? error : new Error('Request validation failed');
      if (err.status == null) err.status = 422;               // считаем это тоже ошибкой валидации
      if (err.code == null)   err.code   = 'ERRORS.VALIDATION';
      return next(err);
    }
  };
}
