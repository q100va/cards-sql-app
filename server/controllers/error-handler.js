import logger from '../logging/logger.js';

export default function errorHandler(err, req, res, next) {
  return handleError(err, req, res, 'Internal Server Error');
}

export function handleError(err, req, res, genericMessage, _next) {
  if (res.headersSent) {
    logger.error({ err, route: `${req.method} ${req.originalUrl}` }, 'Headers already sent');
    return;
  }

  const status = err.status || err.statusCode || 500;
  const cid = req.id || req.correlationId;
  const isProd = process.env.NODE_ENV === 'production';

  const safeMessage =
    status >= 500 && isProd ? genericMessage : (err.message || genericMessage);

  logger.error({ err, correlationId: cid, route: `${req.method} ${req.originalUrl}` }, err.message || 'Unhandled error');

  res.status(status).json({
      message: safeMessage,
      code: err.code || null,
      correlationId: cid,
  });
}

export function notFound(req, _res, next) {
  const e = new Error('Not Found');
  e.status = 404;
  next(e);
}



