import pinoHttp from 'pino-http';
import logger from '../logging/logger.js';

const requestLogger = pinoHttp({
  logger,
  // добавляем correlationId в корень записи лога
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
        // TODO: добавить userId/role позже, когда будет auth
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

export default requestLogger;

