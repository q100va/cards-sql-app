import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import request from 'supertest';

const envPath = fileURLToPath(
  new URL('../../../.env.test', import.meta.url),
);

process.env.NODE_ENV = 'test';

dotenv.config({
  path: envPath,
  override: true,
});

const testDatabase =
  process.env.DB_LINK_TEST ?? '';

if (
  process.env.NODE_ENV !== 'test' ||
  !testDatabase.includes('/test_')
) {
  throw new Error(
    'Integration tests must use a dedicated test database',
  );
}

let sequelize;

beforeAll(async () => {
  const [
    { default: app, initInfrastructure },
    { default: database },
  ] = await Promise.all([
    import('../../../app.js'),
    import('../../../database.js'),
  ]);

  sequelize = database;

  await initInfrastructure();

  global.api = request(app);
});

beforeEach(async () => {
  await sequelize.truncate({
    cascade: true,
    restartIdentity: true,
  });
});

afterAll(async () => {
  await sequelize.close();

  delete global.api;
});
