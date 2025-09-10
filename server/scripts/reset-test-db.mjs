// server/scripts/reset-test-db.mjs
import 'dotenv/config';

export async function reset() {
  // гарантируем тестовые env именно в ЭТОМ процессе
  process.env.NODE_ENV = 'test';
  process.env.DOTENV_CONFIG_PATH =
    process.env.DOTENV_CONFIG_PATH || 'server/.env.test';

  // ВАЖНО: импортировать sequelize ПОСЛЕ env
  const { default: sequelize } = await import('../database.js');

  // ВАЖНО: зарегистрировать модели на ЭТОМ экземпляре sequelize
  // (они выполняют define(...) при импорте)
  await import('../models/index.js');

  await sequelize.authenticate();

  // Надёжно обнуляем схему
  await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE');
  await sequelize.query('CREATE SCHEMA public');

  // Создаём таблицы по моделям
  await sequelize.sync({ force: true });

  return true;
}

// ручной запуск: node -r dotenv/config server/scripts/reset-test-db.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  reset()
    .then(() => {
      console.log('[reset-test-db] OK');
      process.exit(0);
    })
    .catch((e) => {
      console.error('[reset-test-db] FAILED', e);
      process.exit(1);
    });
}
