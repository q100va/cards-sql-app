import { z } from 'zod';

/**
 * Middleware for validating parts of the request (e.g., body, query) against a Zod schema.
 *
 * @param {z.Schema} schema - The Zod schema to validate against.
 * @param {string} [part='body'] - The part of the request to validate (default is 'body').
 * @returns {Function} Express middleware function.
 */
export function validateRequest(schema, part = 'body') {


  return (req, res, next) => {
    try {
      console.log(part, req[part]);
      // Validate the specified part of the request using the provided schema.
      const parseResult = schema.safeParse(req[part]);
      // If the validation fails, throw an error with a detailed message.
      if (!parseResult.success) {
        // Convert the error details to a tree-like structure for easier reading.
        const errorMessage = JSON.stringify(z.treeifyError(parseResult.error), null, 2);
        throw new Error(errorMessage);
      }
      // Replace the original request data with the parsed (validated & sanitized) data.
      req[part] = parseResult.data;
      // Proceed to the next middleware function.
      next();
    } catch (err) {
      // Log detailed error information on the server.
      console.error('Sanitization error:', err);
      // Respond with a 400 status and a generic error message to avoid exposing internal details.
      res.status(400).send('Неверный формат данных запроса.');
    }
  };
}
