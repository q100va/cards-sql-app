import { z } from 'zod';

/**
 * Validates a specific request part (e.g. body, params, query) against a Zod schema.
 *
 * @param {z.Schema} schema - Zod schema to validate against.
 * @param {'body'|'params'|'query'|'headers'|'cookies'} [part='body'] - Request part to validate.
 * @returns {import('express').RequestHandler}
 */
export function validateRequest(schema, part = 'body') {
  return (req, res, next) => {
    try {
      // Validate the selected request part against the provided schema.
      const parsed = schema.safeParse(req[part]);

      // On validation failure, return a 400 without leaking details.
      if (!parsed.success) {
        const errorMessage = JSON.stringify(z.treeifyError(parsed.error), null, 2);
        // Optional server-side logging for diagnostics.
        console.error('Zod validation failed:', errorMessage);
        return res.status(400).send('Неверный формат данных запроса.');
      }

      // Overwrite request part with parsed (validated & coerced) data.
      req[part] = parsed.data;

      // Continue the pipeline.
      next();
    } catch (err) {
      // Catch unexpected runtime errors during validation.
      console.error('Validation middleware error:', err);
      res.status(400).send('Неверный формат данных запроса.');
    }
  };
}
