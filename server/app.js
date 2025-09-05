// src/app.js
import express from 'express';
import { fileURLToPath } from 'url';
import path, { join } from 'path';

import sequelize from './database.js';
import logger from './logging/logger.js';
import { initAuditHooks } from './logging/audit-hooks.js';
import requestLogger from './middlewares/request-logger.js';
import { correlationId } from './middlewares/correlation-id.js';
import { withRequestContext } from './middlewares/request-context.js';
import { handleError, notFound } from './middlewares/error-handler.js';

import SessionApi from './routes/session-api.js';
import AddressesApi from './routes/addresses-api.js';
import UsersApi from './routes/users-api.js';
import RolesApi from './routes/roles-api.js';
import AuditApi from './routes/audit-api.js';
import ClientLogsApi from './routes/client-logs.js';

import { scheduleAuditCleanup } from './retention/scheduler.js';
import { runAuditCleanupCatchUp } from './retention/startup-catchup.js';

import { AuditLog, Role, Locality, District, Region, Country, UserContact, UserAddress, User, SearchUser, Operation, OutdatedName } from './models/index.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(correlationId());
app.use(requestLogger);

// статика
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
global.__basedir = __dirname;
app.use(express.static(join(__dirname, '../public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:56379');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-lang');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// request context
app.use(withRequestContext);

// API
app.use('/api/session', SessionApi);
app.use('/api/addresses', AddressesApi);
app.use('/api/users', UsersApi);
app.use('/api/roles', RolesApi);
app.use('/api/audit', AuditApi);
app.use('/api/client-logs', ClientLogsApi);

// 404 + errors
app.use(notFound);
app.use(handleError);

// ⚠️ НИКАКОГО listen здесь!
// Инициализацию БД/cron вынесем в server.js, но можно оставить функции,
// если защитить их от запуска в тестовом окружении.
export async function initInfrastructure() {
  const isProd = process.env.NODE_ENV === 'production';

  await sequelize.authenticate();
  logger.info('DB authenticated');

  await Country.sync({ alter: !isProd });
  await Region.sync({ alter: !isProd });
  await District.sync({ alter: !isProd });
  await Locality.sync({ alter: !isProd });
  await Role.sync({ alter: !isProd });
  await Operation.sync({ alter: !isProd });
  await User.sync({ alter: !isProd });
  await UserContact.sync({ alter: !isProd });
  await UserAddress.sync({ alter: !isProd });
  await SearchUser.sync({ alter: !isProd });
  await OutdatedName.sync({ alter: !isProd });
  await AuditLog.sync({ alter: !isProd });

  initAuditHooks(sequelize);

  // CRON/retention — не запускать в тестах
  if (process.env.NODE_ENV !== 'test') {
    try { await runAuditCleanupCatchUp(); } catch (e) { logger.warn({ err: e }, '[retention] catch-up non-fatal error'); }
    scheduleAuditCleanup();
  }

  logger.info('All models synced');
}

export default app;
