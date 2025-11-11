// src/app.js
import express from 'express';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import cookieParser from 'cookie-parser';

import sequelize from './database.js';
import logger from './logging/logger.js';
import { initAuditHooks } from './logging/audit-hooks.js';
import requestLogger from './middlewares/request-logger.js';
import { correlationId } from './middlewares/correlation-id.js';
import { withRequestContext } from './middlewares/request-context.js';
import { handleError, notFound } from './middlewares/error-handler.js';

import SessionApi from './routes/session-api.js';
import ToponymsApi from './routes/toponyms-api.js';
import FilesApi from './routes/files-api.js';
import UsersApi from './routes/users-api.js';
import RolesApi from './routes/roles-api.js';
import AuditApi from './routes/audit-api.js';
import ClientLogsApi from './routes/client-logs.js';
import AuthApi from './routes/auth-api.js';

import { scheduleAuditCleanup } from './retention/scheduler.js';
import { runAuditCleanupCatchUp } from './retention/startup-catchup.js';

import { AuditLog, Role, Locality, District, Region, Country, UserContact, UserAddress, User, SearchUser, RolePermission, OutdatedName, RefreshToken } from './models/index.js';
import { corsMiddleware } from './cors.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(correlationId());
app.use(requestLogger);

// статика
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
global.__basedir = __dirname;
app.use(express.static(join(__dirname, '../public')));

// CORS

/* const allowed = new Set([
  'http://localhost:56379',
  'http://127.0.0.1:56379',
]);


app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowed.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  // res.header('Access-Control-Allow-Origin', 'http://localhost:56379');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-lang');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}); */

app.set('trust proxy', 1);
app.use(corsMiddleware);

// request context
app.use(withRequestContext);

app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.head('/healthz', (_req, res) => res.sendStatus(200));


// API
app.use('/api/session', SessionApi);
app.use('/api/toponyms', ToponymsApi);
app.use('/api/files', FilesApi);
app.use('/api/users', UsersApi);
app.use('/api/roles', RolesApi);
app.use('/api/audit', AuditApi);
app.use('/api/client-logs', ClientLogsApi);
app.use('/api/auth', AuthApi);

const noCache = (_req, res, next) => {
  res.set({'Cache-Control':'no-cache, no-store, must-revalidate','Pragma':'no-cache','Expires':'0'});
  next();
};
app.use(['/api/auth/permissions','/api/sessions/me'], noCache);


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

  const syncOpts = isProd ? { alter: true } : { force: false };

  await Country.sync(syncOpts);
  await Region.sync(syncOpts);
  await District.sync(syncOpts);
  await Locality.sync(syncOpts);
  await Role.sync(syncOpts);
  await RolePermission.sync(syncOpts);
  await User.sync(syncOpts);
  await UserContact.sync(syncOpts);
  await UserAddress.sync(syncOpts);
  await SearchUser.sync(syncOpts);
  await OutdatedName.sync(syncOpts);
  await AuditLog.sync(syncOpts);
  await RefreshToken.sync(syncOpts);

  initAuditHooks(sequelize);

  // CRON/retention — не запускать в тестах
  if (process.env.NODE_ENV !== 'test') {
    try { await runAuditCleanupCatchUp(); } catch (e) { logger.warn({ err: e }, '[retention] catch-up non-fatal error'); }
    scheduleAuditCleanup();
  }

  logger.info('All models synced');
}

export default app;
