// server.js
import app, { initInfrastructure } from './app.js';
import { syncAllRolesPermissions } from './controllers/sync-permissions.js';
import logger from './logging/logger.js';

const port = process.env.PORT || 8080;

initInfrastructure()
  .then(async () => {

    if (process.env.PERMS_SYNC_ON_BOOT !== 'false') {
      await syncAllRolesPermissions();
      console.log('[perms] synced on boot');
    }
    app.listen(port, () => logger.info({ port }, `Application started and listening on port: ${port}`));
  })
  .catch((err) => {
    logger.error({ err }, 'Unable to initialize application');
    process.exit(1);
  });
