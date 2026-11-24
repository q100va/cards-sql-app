import { createInterface } from 'node:readline/promises';
import { BootstrapError, readPassword } from './bootstrap-password.mjs';

let sequelize;

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    throw new BootstrapError('NODE_ENV must be production.');
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new BootstrapError('An interactive terminal is required for hidden password input.');
  }

  if (!process.env.PASSWORD_PEPPER) {
    throw new BootstrapError('PASSWORD_PEPPER is not configured.');
  }

  try {
    const url = new URL(process.env.DATABASE_URL?.trim() ?? '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
        !url.hostname || url.pathname.length <= 1) {
      throw new Error();
    }
  } catch {
    throw new BootstrapError('DATABASE_URL must identify a PostgreSQL host and database.');
  }

  ({ default: sequelize } = await import('../database.js'));
  // Sequelize can resolve an explicit host option from the URL query.
  const { host, port, database } = sequelize.config;
  if ([host, database].some(value => typeof value !== 'string' || !value ||
      /[\p{Cc}\p{Cf}]/u.test(value)) || !/^\d+$/.test(port)) {
    throw new BootstrapError('DATABASE_URL must identify a PostgreSQL host and database.');
  }
  const targetHost = host.includes(':') ? `[${host}]` : host;
  console.log(`Target database: ${targetHost}:${port}/${database}`);

  const { Role, RolePermission, User } = await import('../models/index.js');
  const { OPERATIONS, OPERATION_FLAG } = await import('../shared/operations.js');
  const { hashPassword } = await import('../security/passwords.mjs');

  async function checkEmpty(message, transaction) {
    const counts = await Promise.all([
      User.count({ transaction }),
      Role.count({ transaction }),
      RolePermission.count({ transaction }),
    ]);

    if (counts.some(Boolean)) throw new BootstrapError(message);
  }

  await sequelize.authenticate();
  await checkEmpty('Bootstrap refused: users, roles or permissions already exist.');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const cancellation = new AbortController();
  rl.on('SIGINT', () => cancellation.abort());
  rl.on('close', () => cancellation.abort());
  const options = { signal: cancellation.signal };

  let userName;
  let firstName;
  let lastName;
  let confirmation;

  try {
    userName = (await rl.question('Admin username: ', options)).trim();
    firstName = (await rl.question('First name: ', options)).trim();
    lastName = (await rl.question('Last name: ', options)).trim();
    confirmation = (await rl.question('Type CREATE ADMIN to continue: ', options)).trim();
  } catch (error) {
    if (cancellation.signal.aborted) throw new BootstrapError('Cancelled.');
    throw error;
  } finally {
    rl.close();
  }

  if (confirmation !== 'CREATE ADMIN') {
    throw new BootstrapError('Cancelled.');
  }

  if ([userName, firstName, lastName].some(value => !value || /[\p{Cc}\p{Cf}]/u.test(value)) ||
      userName.length < 5 || userName.length > 20 || firstName.length > 50 || lastName.length > 50) {
    throw new BootstrapError('Enter a username of 5-20 characters and names of 1-50 characters.');
  }

  const passwordHash = await hashPassword(await readPassword());

  await sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(42043)', { transaction });
    await checkEmpty('Bootstrap refused: database is no longer empty.', transaction);

    const role = await Role.create({
      name: 'Administrator',
      description: 'Initial system administrator with full application permissions',
    }, { transaction });

    await RolePermission.bulkCreate(
      OPERATIONS.map((operation) => ({
        roleId: role.id,
        name: operation.operation,
        access: true,
        disabled: operation.flag === OPERATION_FLAG.LIMITED,
      })),
      { transaction },
    );

    await User.create({
      userName,
      firstName,
      lastName,
      roleId: role.id,
      password: passwordHash,
      isRestricted: false,
    }, { transaction });
  });

  console.log('Administrator created.');
}

try {
  try {
    await import('dotenv/config');
    await main();
  } finally {
    await sequelize?.close();
  }
} catch (error) {
  const message = error instanceof BootstrapError
    ? error.message
    : 'An unexpected error occurred. Verify the target database, schema and deployment configuration.';
  console.error(`Bootstrap failed: ${message}`);
  process.exitCode = 1;
}
