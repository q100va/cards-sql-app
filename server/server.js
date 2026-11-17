import app, {
  initInfrastructure,
} from './app.js';
import {
  syncAllRolesPermissions,
} from './controllers/sync-permissions.js';
import logger from './logging/logger.js';

const DEFAULT_PORT = 8080;

const port =
  Number.parseInt(
    process.env.PORT ?? '',
    10,
  ) || DEFAULT_PORT;

/**
 * Initializes infrastructure, synchronizes permissions,
 * and starts the HTTP server.
 */
async function startServer() {
  try {
    await initInfrastructure();

    if (
      process.env.PERMS_SYNC_ON_BOOT !==
      'false'
    ) {
      await syncAllRolesPermissions();

      logger.info(
        '[permissions] synchronized on boot',
      );
    }

    app.listen(
      port,
      () => {
        logger.info(
          { port },
          'Application started',
        );
      },
    );
  } catch (error) {
    logger.fatal(
      { err: error },
      'Unable to initialize application',
    );

    process.exit(1);
  }
}

startServer();
