// server/scripts/reset-test-db.mjs
import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_PATH =
  process.env.DOTENV_CONFIG_PATH || 'server/.env.test';

// БД/модели грузим после env
const { default: sequelize } = await import('../database.js');
const models = await import('../models/index.js');
const { Role, User, Operation } = models;

// !!! Подставь правильный путь к константе OPERATIONS
// Ожидается формат: [{ operation: 'partners.read', flag: 'FULL'|'PART'|... }, ...]
import { OPERATIONS } from '../shared/operations.js'; // <-- поправь путь

// Если нет общей константы, можно временно задать локально:
// const OPERATIONS = [
//   { operation: 'partners.read',   flag: 'PART' },
//   { operation: 'partners.write',  flag: 'FULL' },
//   { operation: 'users.read',      flag: 'PART' },
//   { operation: 'users.write',     flag: 'FULL' },
// ];

export async function reset() {
  console.log('[cypress task] -> reset()');
  await sequelize.authenticate();

  await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE');
  await sequelize.query('CREATE SCHEMA public');

  await sequelize.sync({ force: true });
  await seedRolesAndOperations();
  await seedAdminUser();
  return true;
}

/** Создаём роли и полный комплект операций для каждой роли */
async function seedRolesAndOperations() {
  const t = await sequelize.transaction();
  try {
    // 1) Базовые роли
    const baseRoles = [
      { name: 'Coordinator', description: 'Coordinator' },
      { name: 'User',        description: 'Volunteer'  },
    ];
    await Role.bulkCreate(baseRoles, { transaction: t });

    const [adminRole] = await Role.findOrCreate({
      where: { name: 'Admin' },
      defaults: { description: 'Administrator' },
      transaction: t,
    });

    // 2) Получим все роли и снесём их операции (на случай повторного запуска)
    const roles = await Role.findAll({ transaction: t });

    // Для надёжности удалим все старые операции этих ролей (если сидим повторно)
    await Operation.destroy({
      where: { roleId: roles.map(r => r.id) },
      transaction: t,
    });

    // 3) Для каждой роли — полный набор операций (как в реальном /create-role)
    const mkRows = (roleId) =>
      OPERATIONS.map(op => ({
        name: op.operation,
        roleId,
        access: false,
        disabled: op.flag === 'FULL', // как в твоём роуте
      }));

    const allRows = roles.flatMap(r => mkRows(r.id));

    // Если в модели есть уникальный индекс (roleId,name), то этого достаточно;
    // при повторном сидинге мы уже сделали destroy выше.
    await Operation.bulkCreate(allRows, { transaction: t });

    await t.commit();
    console.log(`[reset-db] roles+operations seeded: roles=${roles.length}, opsPerRole=${OPERATIONS.length}`);
  } catch (e) {
    await t.rollback();
    console.error('[reset-db] seedRolesAndOperations failed:', e?.message || e);
    throw e;
  }
}

/** Админ-пользователь */
async function seedAdminUser() {
  const t = await sequelize.transaction();
  try {
    const { hashPassword } = await import('../controllers/passwords.mjs');

    const adminRole = await Role.findOne({ where: { name: 'Admin' }, transaction: t });
    if (!adminRole) throw new Error('Admin role not found');

    const passwordHash = await hashPassword('p@ss12345');

    const [adminUser, created] = await User.findOrCreate({
      where: { userName: 'superAdmin' },
      defaults: {
        userName: 'superAdmin',
        firstName: 'Admin',
        lastName:  'User',
        password:  passwordHash,
        roleId:    adminRole.id,
        patronymic: null,
        comment:    null,
      },
      transaction: t,
    });

    if (!created) {
      adminUser.firstName = 'Admin';
      adminUser.lastName  = 'User';
      adminUser.password  = passwordHash;
      adminUser.roleId    = adminRole.id;
      await adminUser.save({ transaction: t });
    }

    await t.commit();
    console.log('[reset-db] seeded admin: superAdmin / p@ss12345');
  } catch (e) {
    await t.rollback();
    console.error('[reset-db] seedAdminUser failed:', e?.message || e);
    throw e;
  }
}

// Ручной запуск: node -r dotenv/config server/scripts/reset-test-db.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  reset()
    .then(() => { console.log('[reset-test-db] OK'); process.exit(0); })
    .catch((e) => { console.error('[reset-test-db] FAILED', e); process.exit(1); });
}
