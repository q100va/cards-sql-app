import { z } from 'zod';

export function validateRequest(
  schema,
  part = 'body',
) {
  return (req, _res, next) => {
    try {
      const parsed =
        schema.safeParse(req[part]);

      if (!parsed.success) {
        const error =
          new Error(
            'Request validation failed',
          );

        error.status = 422;
        error.code =
          'ERRORS.VALIDATION';
        error.details =
          z.treeifyError(
            parsed.error,
          );

        return next(error);
      }

      if (part === 'query') {
        Object.defineProperty(
          req,
          'query',
          {
            value: parsed.data,
            writable: true,
            configurable: true,
            enumerable: true,
          },
        );
      } else {
        req[part] = parsed.data;
      }

      return next();
    } catch (error) {
      const validationError =
        error instanceof Error
          ? error
          : new Error(
            'Request validation failed',
          );

      validationError.status =
        validationError.status ?? 422;

      validationError.code =
        validationError.code ??
        'ERRORS.VALIDATION';

      return next(
        validationError,
      );
    }
  };
}
