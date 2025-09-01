import express from 'express';
import { handleError } from '../../server/middlewares/error-handler.js';

export function makeTestApp(router, mount = '/') {
  const app = express();
  app.use(express.json());
  app.use(mount, router);
  app.use(handleError);
  return app;
}
