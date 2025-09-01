import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: { app: 'cards-sql-app', env: process.env.NODE_ENV || 'development' },
  timestamp: pino.stdTimeFunctions.isoTime,
  // hide sensitive data in logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'user.password',
      'body.password',
      'body.email',
    ],
    remove: true,
  },
  // pretty print in non-prod
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
            messageKey: 'msg',
          },
        },
      }),
});

export default logger;
