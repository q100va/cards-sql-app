// server/scripts/reset-test-db.mjs
import { Op } from 'sequelize';
import { loadEnvironment, withApprovedDatabase } from '../../cypress/safety/node.mjs';
import { isDirectExecution } from '../../cypress/safety/cli-entry.mjs';

// Guard module entry as well as reset(): a direct CLI/import must reject an
// unsafe environment before CLI dispatch is considered.
loadEnvironment(process.env, true);

let sequelize, Role, User, RolePermission, Country;


import { OPERATIONS } from '../shared/operations.js';

function requireMethods(owner, name, methods) {
  for (const method of methods) {
    if (typeof owner?.[method] !== 'function') throw new Error(`${name}.${method} is required for the E2E reset.`);
  }
}

async function loadResetDependencies() {
  if (!process.env.PASSWORD_PEPPER) throw new Error('PASSWORD_PEPPER is not configured');
  if (!Op.in || !Array.isArray(OPERATIONS) || !OPERATIONS.length) throw new Error('E2E reset permission dependencies are invalid.');
  const { hashPassword } = await import('../security/passwords.mjs');
  requireMethods({ hashPassword }, 'passwords', ['hashPassword']);
  // Resolve the native hashing dependency and both existing seed hashes before
  // loading a database client, so hash/import failures cannot follow a drop.
  const adminHash = await hashPassword('p@ss12345');
  const viewerHash = await hashPassword('p@ss54321');
  if (typeof adminHash !== 'string' || !adminHash || typeof viewerHash !== 'string' || !viewerHash) {
    throw new Error('E2E seed password hashing did not return valid hashes.');
  }
  const [{ default: database }, models] = await Promise.all([
    import('../database.js'), import('../models/index.js'),
  ]);
  requireMethods(database, 'sequelize', ['authenticate', 'query', 'sync', 'transaction']);
  requireMethods(models.Role, 'Role', ['bulkCreate', 'findAll', 'findOne']);
  requireMethods(models.User, 'User', ['findOrCreate']);
  requireMethods(models.RolePermission, 'RolePermission', ['destroy', 'bulkCreate', 'update']);
  if (typeof models.Country?.getTableName !== 'function' && !models.Country?.tableName) {
    throw new Error('Country table metadata is required for the E2E reset.');
  }
  return { sequelize: database, models, adminHash, viewerHash };
}

export async function reset() {
  return withApprovedDatabase({ authorizeReset: true, load: loadResetDependencies, run: async (dependencies) => {
    sequelize = dependencies.sequelize;
    ({ Role, User, RolePermission, Country } = dependencies.models);
    console.log('[cypress task] -> reset()');
    await sequelize.authenticate();

    await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE');
    await sequelize.query('CREATE SCHEMA public');

    await sequelize.sync({ force: true });
    await seedRolesAndOperations();
    await seedAdminUser(dependencies.adminHash);
    await seedViewer(dependencies.viewerHash);
    await seedCountry();

    return true;
  } });
}

/** Создаём роли и полный комплект операций для каждой роли */
async function seedRolesAndOperations() {
  const t = await sequelize.transaction();
  try {
    // 1) роли
    const baseRoles = [
      { name: 'Admin',       description: 'Administrator' },
      { name: 'Coordinator', description: 'Coordinator' },
      { name: 'User',        description: 'Volunteer' },
      { name: 'Viewer',      description: 'Viewer' },
    ];
    await Role.bulkCreate(baseRoles, { transaction: t });

    const roles = await Role.findAll({ transaction: t });
    const roleByName = Object.fromEntries(roles.map(r => [r.name, r]));
    const adminRoleId  = roleByName.Admin.id;
    const viewerRoleId = roleByName.Viewer.id;

    // 2) зачистка старых прав
    await RolePermission.destroy({
      where: { roleId: roles.map(r => r.id) },
      transaction: t,
    });

    // 3) полная матрица прав
    //    ВАЖНО: пишем в колонку "name" (а не "operation")
    const mkRows = (roleId) =>
      OPERATIONS.map(op => ({
        roleId,
        name: op.operation,            // 👈 колонка в БД — "name"
        access: false,
        disabled: op.flag === 'FULL',
      }));

    await RolePermission.bulkCreate(
      roles.flatMap(r => mkRows(r.id)),
      { transaction: t }
    );

    // 4) Admin — всё включено
    await RolePermission.update(
      { access: true },
      { where: { roleId: adminRoleId }, transaction: t }
    );

    // 5) Viewer — только выбранные операции
    const viewerOps = [
      'VIEW_LIMITED_USERS_LIST',
      'VIEW_LIMITED_TOPONYMS_LIST',
      'VIEW_TOPONYM',
      // 'ADD_NEW_TOPONYM', // добавь сюда, если Viewer должен уметь добавлять
    ];

    const [updated] = await RolePermission.update(
      { access: true },
      {
        where: {
          roleId: viewerRoleId,            // 👈 обязательно сузить по роли
          name: { [Op.in]: viewerOps },    // 👈 фильтр по колонке "name"
        },
        transaction: t,
      }
    );
    console.log(`[reset-db] viewer perms updated: ${updated}`);

    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

/** Админ-пользователь */
async function seedAdminUser(passwordHash) {
  const t = await sequelize.transaction();
  try {
    const adminRole = await Role.findOne({ where: { name: 'Admin' }, transaction: t });
    if (!adminRole) throw new Error('Admin role not found');

    const [adminUser, created] = await User.findOrCreate({
      where: { userName: 'superAdmin' },
      defaults: {
        userName: 'superAdmin',
        firstName: 'Admin',
        lastName: 'User',
        password: passwordHash,
        roleId: adminRole.id,
        patronymic: null,
        comment: null,
      },
      transaction: t,
    });

    if (!created) {
      adminUser.firstName = 'Admin';
      adminUser.lastName = 'User';
      adminUser.password = passwordHash;
      adminUser.roleId = adminRole.id;
      await adminUser.save({ transaction: t });
    }

    await t.commit();
    console.log('[reset-db] seeded admin account');
  } catch (e) {
    await t.rollback();
    console.error('[reset-db] seedAdminUser failed');
    throw e;
  }
}

/** View-пользователь */
async function seedViewer(passwordHash) {
  const t = await sequelize.transaction();
  try {
    const viewerRole = await Role.findOne({ where: { name: 'Viewer' }, transaction: t });
    if (!viewerRole) throw new Error('Viewer role not found');

    const [adminUser, created] = await User.findOrCreate({
      where: { userName: 'viewerUser' },
      defaults: {
        userName: 'viewerUser',
        firstName: 'Viewer',
        lastName: 'User',
        password: passwordHash,
        roleId: viewerRole.id,
        patronymic: null,
        comment: null,
      },
      transaction: t,
    });

    if (!created) {
      adminUser.firstName = 'Viewer';
      adminUser.lastName = 'User';
      adminUser.password = passwordHash;
      adminUser.roleId = viewerRole.id;
      await adminUser.save({ transaction: t });
    }

    await t.commit();
    console.log('[reset-db] seeded viewer account');
  } catch (e) {
    await t.rollback();
    console.error('[reset-db] seedViewerUser failed');
    throw e;
  }
}

/** Country */
/* async function seedCountry() {
  const t = await sequelize.transaction();
  try {

    await Country.create(
      { name: 'Россия', isRestricted: false  },
      {
        transaction: t,
      });

    await t.commit();
    console.log('[reset-db] seedCountry: Россия');
  } catch (e) {
    console.log('[reset-db] seedCountry failed');
    await t.rollback();
    throw e;
  }
} */

async function seedCountry() {
  const t = await sequelize.transaction();
  try {
    // имя таблицы как строка (на случай кастомных схем/кавычек)
    const tbl = typeof Country.getTableName === 'function'
      ? Country.getTableName().toString()
      : Country.tableName;

    // Вставить страну с фиксированным id=143 (обновить, если уже есть)
    await sequelize.query(
      `INSERT INTO "${tbl}" ("id","name","isRestricted", "createdAt", "updatedAt")
       VALUES (143, 'Россия', false, '2025-02-02 23:01:57.196-05', '2025-02-02 23:01:57.196-05')
       ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name";`,
      { transaction: t }
    );

    // Синхронизировать последовательность, чтобы она не пыталась вставить 1/2/...
    await sequelize.query(
      `SELECT setval(
         pg_get_serial_sequence('"${tbl}"', 'id'),
         GREATEST((SELECT MAX("id") FROM "${tbl}"), 143),
         true
       );`,
      { transaction: t }
    );

    await t.commit();
    console.log('[reset-db] seedCountry: Россия (id=143)');
  } catch (e) {
    await t.rollback();
    console.error('[reset-db] seedCountry failed');
    throw e;
  }
}


// Direct CLI entry uses the same explicit environment/authorization as Cypress.
if (isDirectExecution(import.meta.url, process.argv[1])) {
  reset()
    .then(() => { console.log('[reset-test-db] OK'); process.exit(0); })
    .catch(() => { console.error('[reset-test-db] FAILED'); process.exit(1); });
}
