import logger from '../logging/logger.js';

export function handleError(err, req, res, next) {
  if (res.headersSent) {
    logger.error({ err, route: `${req.method} ${req.originalUrl}` }, 'Headers already sent');
    return;
  }

  const status = err.status || err.statusCode || 500;
  const cid = req.correlationId || req.id || null;
  const message = err.customMessage || err.userMessage || err.message || 'Internal Server Error';

  const logPayload = {
    err,                               // Error как объект — Pino красиво сериализует stack
    correlationId: cid,
    route: `${req.method} ${req.originalUrl}`,
  };
  if (status >= 400 && status < 500 && err.details) {
    logPayload.validation = err.details; // ← тут окажется «дерево» из z.treeifyError
  }

  const logMsg = err.message || 'Unhandled error';
  logger.error(logPayload, logMsg);

  res.status(status).json({
    message,
    code: err.code ?? null,
    correlationId: cid,
  });
}

export function notFound(_req, _res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
}



