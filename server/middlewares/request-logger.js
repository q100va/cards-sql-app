// server/src/middlewares/request-logger.js
import pinoHttp from 'pino-http';
import logger from '../logging/logger.js';

export const requestLoggerOptions = {
  logger, // will be overridden by the factory when injected
  // add correlationId to the root log payload
  customProps: (req) => ({ correlationId: req.correlationId }),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `ERROR ${req.method} ${req.url} → ${res.statusCode || 500}: ${err?.message}`,
  serializers: {
    req(req) {
      return {
        id: req.correlationId,
        method: req.method,
        url: req.url,
        ip: req.ip,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
};

// NEW: factory so tests can inject fake pino-http / logger
export function buildRequestLogger(pinoHttpImpl = pinoHttp, baseLogger = logger) {
  return pinoHttpImpl({ ...requestLoggerOptions, logger: baseLogger });
}

// Default export for app usage
export default buildRequestLogger();
