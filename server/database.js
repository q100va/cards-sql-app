import { Sequelize } from 'sequelize';
import 'dotenv/config';

const isTest =
  process.env.NODE_ENV === 'test';

const isProd =
  process.env.NODE_ENV === 'production';

function requireEnv(name) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured`,
    );
  }

  return value;
}

function getConnectionString() {
  if (isProd) {
    return requireEnv(
      'DATABASE_URL',
    );
  }

  const user =
    requireEnv('DB_USERNAME');

  const password =
    requireEnv('DB_PASSWORD');

  const host =
    isTest
      ? requireEnv('DB_LINK_TEST')
      : requireEnv('DB_LINK');

  return (
    `postgres://${encodeURIComponent(user)}` +
    `:${encodeURIComponent(password)}` +
    `@${host}`
  );
}

const connectionString =
  getConnectionString();

const sequelize =
  new Sequelize(
    connectionString,
    {
      dialect: 'postgres',
      logging: false,
    },
  );

export default sequelize;
