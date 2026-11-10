import pinoHttp from 'pino-http';

import logger from '../logging/logger.js';

function getRequestPath(req) {
  return (
    req.originalUrl ??
    req.url ??
    ''
  ).split('?')[0];
}

export const requestLoggerOptions = {
  logger,

  // Reuse the correlation ID created earlier in the middleware chain.
  genReqId: (req) =>
    req.correlationId,

  // Pass the raw Express request to custom serializers.
  wrapSerializers: false,

  // Keep the correlation ID available at the root log level.
  customProps: (req) => ({
    correlationId:
      req.correlationId ??
      null,
  }),

  customLogLevel: (
    _req,
    res,
    error,
  ) => {
    if (
      error ||
      res.statusCode >= 500
    ) {
      return 'error';
    }

    if (res.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },

  customSuccessMessage: (
    req,
    res,
  ) =>
    `${req.method} ${getRequestPath(req)} → ${res.statusCode}`,

  customErrorMessage: (
    req,
    res,
    error,
  ) =>
    `ERROR ${req.method} ${getRequestPath(req)} → ${
      res.statusCode || 500
    }: ${error?.message ?? 'Unknown error'}`,

  serializers: {
    req(req) {
      return {
        id:
          req.correlationId ??
          null,
        method: req.method,
        path: getRequestPath(req),
        ip: req.ip ?? null,
      };
    },

    res(res) {
      return {
        statusCode:
          res.statusCode,
      };
    },
  },
};

export function buildRequestLogger(
  pinoHttpImpl = pinoHttp,
  baseLogger = logger,
) {
  return pinoHttpImpl({
    ...requestLoggerOptions,
    logger: baseLogger,
  });
}

export default buildRequestLogger();
