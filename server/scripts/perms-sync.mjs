#!/usr/bin/env node
import 'dotenv/config';
import sequelize from '../server/db.js';
import { syncAllRolesPermissions } from '../server/permissions/sync-permissions.js';

try {
  await sequelize.authenticate();
  await syncAllRolesPermissions();
  console.log('Permissions synced.');
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
