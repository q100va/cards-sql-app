#!/usr/bin/env node

import 'dotenv/config';

import sequelize from '../database.js';
import logger from '../logging/logger.js';
import {
  syncAllRolesPermissions,
} from '../controllers/sync-permissions.js';

async function syncPermissions() {
  try {
    await sequelize.authenticate();

    await syncAllRolesPermissions();

    logger.info(
      'Permissions synchronized successfully',
    );
  } catch (error) {
    logger.error(
      { err: error },
      'Permissions synchronization failed',
    );

    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (error) {
      logger.warn(
        { err: error },
        'Failed to close database connection',
      );

      process.exitCode = 1;
    }
  }
}

await syncPermissions();
