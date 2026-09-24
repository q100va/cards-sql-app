#!/usr/bin/env node
import 'dotenv/config';
import sequelize from '../database.js';
import { syncAllRolesPermissions } from '../controllers/sync-permissions.js';

try {
  await sequelize.authenticate();
  await syncAllRolesPermissions();
  console.log('Permissions synced.');
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
