import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { API_URL, FRONTEND_URL } from './policy.mjs';
import { identity, withApprovedDatabase } from './node.mjs';

export function backendHandler(app, context, isReady = () => true) {
  return (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(isReady() ? 200 : 503);
      return res.end(isReady() ? 'ok' : 'initializing');
    }
    if (req.method === 'OPTIONS' && req.headers.origin === FRONTEND_URL) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': FRONTEND_URL,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-lang,x-e2e-run-id',
      });
      return res.end();
    }
    if (req.headers['x-e2e-run-id'] !== context.env.E2E_RUN_ID) {
      res.writeHead(403);
      return res.end('Dedicated E2E run identity required.');
    }
    if (!isReady()) {
      res.writeHead(503);
      return res.end('E2E backend is initializing.');
    }
    if (req.method === 'GET' && req.url === '/__e2e/identity') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(identity(context)));
    }
    return app(req, res);
  };
}

export async function startBackend({ env = process.env, load = async () => {
  const [{ default: app, initInfrastructure }, { default: sequelize }, { syncAllRolesPermissions }] = await Promise.all([
    import('../../server/app.js'), import('../../server/database.js'), import('../../server/controllers/sync-permissions.js'),
  ]);
  return { app, initInfrastructure, sequelize, syncAllRolesPermissions };
}, listen = (handler) => new Promise((resolve, reject) => {
  const server = createServer(handler);
  server.once('error', reject);
  server.listen(Number(new URL(API_URL).port), 'localhost', () => resolve(server));
}) } = {}) {
  return withApprovedDatabase({ env, authorizeReset: true, load, run: async (dependencies, context) => {
    let ready = false;
    const server = await listen(backendHandler(dependencies.app, context, () => ready));
    try {
      await dependencies.initInfrastructure();
      if (context.env.PERMS_SYNC_ON_BOOT !== 'false') await dependencies.syncAllRolesPermissions();
      ready = true;
      return server;
    } catch (error) {
      server.close();
      throw error;
    }
  } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startBackend().catch(() => {
    console.error('E2E backend refused startup or failed initialization. Check the dedicated E2E configuration.');
    process.exitCode = 1;
  });
}
