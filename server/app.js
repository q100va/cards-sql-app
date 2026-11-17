// server/app.js

import express from 'express';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import cookieParser from 'cookie-parser';

import sequelize from './database.js';
import logger from './logging/logger.js';

import { initAuditHooks } from './audit/audit-hooks.js';
import requestLogger from './middlewares/request-logger.js';
import { correlationId } from './middlewares/correlation-id.js';
import { withRequestContext } from './middlewares/request-context.js';
import {
  handleError,
  notFound,
} from './middlewares/error-handler.js';

import { corsMiddleware } from './cors.js';

import SessionApi from './routes/session-api.js';
import ToponymsApi from './routes/toponyms-api.js';
import FilesApi from './routes/files-api.js';
import UsersApi from './routes/users-api.js';
import HomesApi from './routes/homes-api.js';
import SeniorsApi from './routes/seniors-api.js';
import PartnersApi from './routes/partners-api.js';
import VolunteersApi from './routes/volunteers-api.js';
import RolesApi from './routes/roles-api.js';
import OccasionsApi from './routes/occasions-api.js';
import OrdersApi from './routes/orders-api.js';
import ReportsApi from './routes/reports-api.js';
import RecipientsApi from './routes/recipients-api.js';
import AuditApi from './routes/audit-api.js';
import ClientLogsApi from './routes/client-logs.js';
import AuthApi from './routes/auth-api.js';

import {
  scheduleAuditCleanup,
} from './retention/scheduler.js';
import {
  runAuditCleanupCatchUp,
} from './retention/startup-catchup.js';

import {
  AuditLog,
  RefreshToken,
  Locality,
  District,
  Region,
  Country,
  Role,
  UserAddress,
  UserContact,
  User,
  UserSearch,
  RolePermission,
  UserOutdatedName,
  Partner,
  PartnerAddress,
  PartnerContact,
  PartnerOutdatedName,
  PartnerSearch,
  VolunteerAddress,
  Volunteer,
  VolunteerContact,
  VolunteerSearch,
  VolunteerOutdatedName,
  VolunteerSubscription,
  VolunteerCooperation,
  VolunteerInstitute,
  Home,
  HomeAddress,
  HomeContact,
  HomeOutdatedName,
  HomeSearch,
  HomeCoordination,
  HomeUpdateDate,
  Senior,
  SeniorOutdatedName,
  SeniorSearch,
  Occasion,
  Recipient,
  Order,
  OrderRecipient,
} from './models/index.js';

const app = express();

app.set('trust proxy', 1);

// Request infrastructure must run before API routes.
app.use(corsMiddleware);
app.use(correlationId());
app.use(requestLogger);
app.use(withRequestContext);

// Client logs use a smaller payload limit than regular API requests.
app.use(
  '/api/client-logs',
  express.json({
    limit: '256kb',
  }),
  ClientLogsApi,
);

app.use(
  express.json({
    limit: '50mb',
  }),
);

app.use(cookieParser());

app.use(
  express.urlencoded({
    extended: true,
    limit: '50mb',
  }),
);

// Serve public static files.
const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

global.__basedir = __dirname;

app.use(
  express.static(
    join(__dirname, '../public'),
  ),
);

// Health check used by hosting infrastructure.
app.get(
  '/healthz',
  (_req, res) =>
    res
      .status(200)
      .send('ok'),
);

const noCache = (
  _req,
  res,
  next,
) => {
  res.set({
    'Cache-Control':
      'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

  return next();
};

// Authentication state and permissions must never be cached.
app.use(
  [
    '/api/auth/permissions',
    '/api/session/me',
  ],
  noCache,
);

// API routes
app.use('/api/session', SessionApi);
app.use('/api/toponyms', ToponymsApi);
app.use('/api/files', FilesApi);
app.use('/api/users', UsersApi);
app.use('/api/homes', HomesApi);
app.use('/api/seniors', SeniorsApi);
app.use('/api/partners', PartnersApi);
app.use('/api/volunteers', VolunteersApi);
app.use('/api/roles', RolesApi);
app.use('/api/occasions', OccasionsApi);
app.use('/api/recipients', RecipientsApi);
app.use('/api/orders', OrdersApi);
app.use('/api/reports', ReportsApi);
app.use('/api/audit', AuditApi);
app.use('/api/auth', AuthApi);

// 404 and centralized error handling must be last.
app.use(notFound);
app.use(handleError);

const MODELS_TO_SYNC = [
  Country,
  Region,
  District,
  Locality,

  Role,
  RolePermission,

  User,
  UserContact,
  UserAddress,
  UserSearch,
  UserOutdatedName,

  Partner,
  PartnerContact,
  PartnerAddress,
  PartnerSearch,
  PartnerOutdatedName,

  Volunteer,
  VolunteerContact,
  VolunteerAddress,
  VolunteerSearch,
  VolunteerOutdatedName,
  VolunteerSubscription,
  VolunteerCooperation,
  VolunteerInstitute,

  Home,
  HomeContact,
  HomeAddress,
  HomeSearch,
  HomeOutdatedName,
  HomeCoordination,
  HomeUpdateDate,

  AuditLog,
  RefreshToken,

  Senior,
  SeniorOutdatedName,
  SeniorSearch,

  Occasion,
  Recipient,
  Order,
  OrderRecipient,
];

export async function initInfrastructure() {
  await sequelize.authenticate();

  logger.info(
    'DB authenticated',
  );

  // Models are already registered by models/index.js.
  // Install audit hooks before application data mutations begin.
  initAuditHooks(sequelize);

  const syncOptions = {
    force: false,
    alter: false,
  };

  // Preserve the existing dependency-safe model sync order.
  for (const Model of MODELS_TO_SYNC) {
    await Model.sync(
      syncOptions,
    );
  }

  // Retention jobs are disabled during tests.
  if (
    process.env.NODE_ENV !== 'test'
  ) {
    try {
      await runAuditCleanupCatchUp();
    } catch (error) {
      logger.warn(
        { err: error },
        '[retention] catch-up non-fatal error',
      );
    }

    scheduleAuditCleanup();
  }

  logger.info(
    'All models synced',
  );
}

export default app;
