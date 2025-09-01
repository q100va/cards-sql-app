import { z } from 'zod';

/**
 * Validates a specific request part (e.g. body, params, query) against a Zod schema.
 *
 * @param {z.Schema} schema - Zod schema to validate against.
 * @param {'body'|'params'|'query'|'headers'|'cookies'} [part='body'] - Request part to validate.
 * @returns {import('express').RequestHandler}
 */
export function validateRequest(schema, part = 'body') {
  return (req, _res, next) => {
    try {
      // Validate the selected request part against the provided schema.
      const parsed = schema.safeParse(req[part]);

      // On validation failure, return a 400 without leaking details.
      if (!parsed.success) {
        const details = z.treeifyError(parsed.error);
        const err = new Error('Request validation failed');
        err.status = 400;
        err.details = details; // для логов
        throw err;
      }

      // Overwrite request part with parsed (validated & coerced) data.
      req[part] = parsed.data;

      // Continue the pipeline.
      next();
    } catch (error) {
      // Catch unexpected runtime errors during validation.
      error.userMessage = 'Неверный формат данных запроса.';
      next(error);
    }
  };
}
