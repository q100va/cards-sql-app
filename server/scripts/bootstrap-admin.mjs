import { createInterface } from 'node:readline/promises';
import { BootstrapError, readHiddenFields, readPassword } from './bootstrap-password.mjs';

let sequelize;

async function main() {
  const args = process.argv.slice(2);
  const repair = args.length === 1 && args[0] === '--repair-existing';
  if (args.length && !repair) throw new BootstrapError('Unknown bootstrap option.');

  if (process.env.NODE_ENV !== 'production') {
    throw new BootstrapError('NODE_ENV must be production.');
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new BootstrapError('An interactive terminal is required for hidden password input.');
  }

  if (!repair && !process.env.PASSWORD_PEPPER) {
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

  const { Role, RolePermission, User, UserAddress, UserContact, UserSearch } =
    await import('../models/index.js');
  const { OPERATIONS, OPERATION_FLAG } = await import('../shared/operations.js');
  const { draftContactsSchema } = await import('../../shared/dist/schemas/user.schema.js');
  const { collectFlatContacts, saveOwnerContactsAndAddress } =
    await import('../controllers/ctrl-create-owner-contacts-address.js');
  const { buildUserSearchContent } = await import('../controllers/ctrl-user-search-content.js');

  const requiredContacts = draftContactsSchema.pick({
    email: true, phoneNumber: true, telegramId: true, telegramPhoneNumber: true,
  });
  const contactLabels = {
    email: 'Email',
    phoneNumber: 'Phone number',
    telegramId: 'Telegram ID',
    telegramPhoneNumber: 'Telegram phone number',
  };

  async function readContacts() {
    const entries = Object.entries(contactLabels);
    const values = await readHiddenFields(entries.map(([, label]) => `${label} (hidden): `));
    const draft = Object.fromEntries(entries.map(([type], index) => [type, [values[index]]]));
    const parsed = requiredContacts.safeParse(draft);
    if (!parsed.success) {
      const labels = [...new Set(parsed.error.issues.map(issue => contactLabels[issue.path[0]]))];
      throw new BootstrapError(`Required contact input is invalid: ${labels.join(', ')}.`);
    }
    try {
      await Promise.all(collectFlatContacts(parsed.data).map(contact => UserContact.build(contact).validate()));
    } catch {
      throw new BootstrapError('Required contact input does not meet the contact model format.');
    }
    return parsed.data;
  }

  async function saveContactsAndSearch(user, draftContacts, transaction) {
    await saveOwnerContactsAndAddress('user', user, { draftContacts }, { UserContact, UserAddress }, transaction);
    const content = await buildUserSearchContent(user.id, transaction);
    await UserSearch.create({ userId: user.id, content }, { transaction });
  }

  async function checkEmpty(message, transaction) {
    const counts = await Promise.all([
      User.count({ transaction }),
      Role.count({ transaction }),
      RolePermission.count({ transaction }),
    ]);

    if (counts.some(Boolean)) throw new BootstrapError(message);
  }

  await sequelize.authenticate();
  if (!repair) await checkEmpty('Bootstrap refused: users, roles or permissions already exist.');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const cancellation = new AbortController();
  rl.on('SIGINT', () => cancellation.abort());
  rl.on('close', () => cancellation.abort());
  const options = { signal: cancellation.signal };

  let userName;
  let firstName;
  let lastName;
  let confirmation;
  let userId;
  const action = repair ? 'REPAIR ADMIN' : 'CREATE ADMIN';

  try {
    if (repair) userId = Number((await rl.question('Existing admin user ID: ', options)).trim());
    userName = (await rl.question('Admin username: ', options)).trim();
    if (!repair) {
      firstName = (await rl.question('First name: ', options)).trim();
      lastName = (await rl.question('Last name: ', options)).trim();
    }
    confirmation = (await rl.question(`Type ${action} to continue: `, options)).trim();
  } catch (error) {
    if (cancellation.signal.aborted) throw new BootstrapError('Cancelled.');
    throw error;
  } finally {
    rl.close();
  }

  if (confirmation !== action) {
    throw new BootstrapError('Cancelled.');
  }

  if (repair && (!Number.isInteger(userId) || userId < 1 || userId > 2147483647 || !userName)) {
    throw new BootstrapError('Enter the existing administrator ID and exact username.');
  }
  if (!repair && ([userName, firstName, lastName].some(value => !value || /[\p{Cc}\p{Cf}]/u.test(value)) ||
      userName.length < 5 || userName.length > 20 || firstName.length > 50 || lastName.length > 50)) {
    throw new BootstrapError('Enter a username of 5-20 characters and names of 1-50 characters.');
  }

  const draftContacts = await readContacts();
  let passwordHash;
  if (!repair) {
    const { hashPassword } = await import('../security/passwords.mjs');
    passwordHash = await hashPassword(await readPassword());
  }

  await sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(42043)', { transaction });
    if (repair) {
      const user = await User.findOne({
        where: { id: userId, userName, isRestricted: false },
        attributes: ['id', 'roleId'],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const role = user && await Role.findByPk(user.roleId, { attributes: ['name'], transaction });
      if (role?.name !== 'Administrator') {
        throw new BootstrapError('Repair refused: the ID and username do not identify an active Administrator.');
      }
      const where = { userId };
      if (await UserContact.count({ where, transaction }) || await UserSearch.count({ where, transaction })) {
        throw new BootstrapError('Repair refused: this administrator already has contacts or search records.');
      }
      await saveContactsAndSearch(user, draftContacts, transaction);
      return;
    }
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

    const user = await User.create({
      userName,
      firstName,
      lastName,
      roleId: role.id,
      password: passwordHash,
      isRestricted: false,
    }, { transaction });
    await saveContactsAndSearch(user, draftContacts, transaction);
  });

  console.log(repair ? 'Administrator contacts and search repaired.' : 'Administrator created.');
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
