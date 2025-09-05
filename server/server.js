// src/server.js
import app, { initInfrastructure } from './app.js';
import logger from './logging/logger.js';

const port = process.env.PORT || 8080;

initInfrastructure()
  .then(() => {
    app.listen(port, () => logger.info({ port }, `Application started and listening on port: ${port}`));
  })
  .catch((err) => {
    logger.error({ err }, 'Unable to initialize application');
    process.exit(1);
  });
