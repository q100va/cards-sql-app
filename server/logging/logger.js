import pino from 'pino';

const environment =
  process.env.NODE_ENV ||
  'development';

const isProd =
  environment === 'production';

const logLevel =
  process.env.LOG_LEVEL?.trim() ||
  (isProd ? 'info' : 'debug');

const logger = pino({
  level: logLevel,

  base: {
    app: 'cards-sql-app',
    env: environment,
  },

  timestamp:
    pino.stdTimeFunctions.isoTime,

  // Prevent credentials and sensitive user data from reaching logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',

      // Covers objects such as user, body, prev, before, and after.
      '*.password',

      // Cover direct request-body logging if it is added later.
      'req.body.password',
      'req.body.email',

      'body.email',
    ],
    remove: true,
  },

  // Keep development logs readable while production stays structured JSON.
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime:
              'SYS:standard',
            messageKey: 'msg',
          },
        },
      }),
});

export default logger;
