import logger from '../logging/logger.js';

const statusToDefaultCode = (s) => {
  if (s === 400) return 'ERRORS.BAD_REQUEST';
  if (s === 401) return 'ERRORS.UNAUTHORIZED';
  if (s === 403) return 'ERRORS.FORBIDDEN';
  if (s === 404) return 'ERRORS.NOT_FOUND';
  if (s === 409) return 'ERRORS.CONFLICT';
  if (s === 422) return 'ERRORS.VALIDATION';
  return 'ERRORS.UNKNOWN'; // 5xx и прочее
};

export function handleError(err, req, res, _next) {
  if (res.headersSent) {
    logger.error({ err, route: `${req.method} ${req.originalUrl}` }, 'Headers already sent');
    return;
  }

  const status = err.status || err.statusCode || 500;
  const cid = req.correlationId || req.id || null;
  const code = err.code || statusToDefaultCode(status);
  const data = err.data || null;
  const logPayload = {
    err,                         // pino красиво сериализует stack
    code,
    status,
    correlationId: cid,
    route: `${req.method} ${req.originalUrl}`,
    lang: req.lang,              // если используешь langDetector
  };

  if (status === 422 && err.details) {
    logPayload.validation = err.details; // zod details, если есть
  }

  logger.error(logPayload, err.message || 'Unhandled error');

  const body = {
    code,
    data,
    correlationId: cid,
  };

  /*   // Если хочешь в dev показывать message для удобства (UI его игнорирует)
    if (process.env.NODE_ENV !== 'production' && (err.customMessage || err.userMessage)) {
      body.message = err.customMessage || err.userMessage;
    } */

  /*   // Детали валидации по желанию
    if (code === 'ERRORS.VALIDATION' && err.fields) {
      body.fields = err.fields; // { email: 'INVALID', roleId: 'REQUIRED' }
    } */

  res.status(status).json(body);
}

export function notFound(req, _res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  err.code = 'ERRORS.NOT_FOUND';
  next(err);
}




