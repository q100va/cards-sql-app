// server/retention/startup-catchup.js
import sequelize from '../database.js';
import logger from '../logging/logger.js';

// вспомогательная таблица для «кэтч-апа»
const STATE_SQL = `
  CREATE TABLE IF NOT EXISTS maintenance_state (
    key text PRIMARY KEY,
    last_run timestamptz NOT NULL
  );
`;

const DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '180', 10);

export async function runAuditCleanupCatchUp() {
  // 1) Проверим коннект — мягко выходим, если нет
  try {
    await sequelize.authenticate();
  } catch (e) {
    logger.warn({ err: e }, '[retention] DB not reachable — skip catch-up');
    return;
  }

  await sequelize.query(STATE_SQL);

  // 2) Узнаём, нужен ли кэтч-ап (больше суток не чистили)
  const [rows] = await sequelize.query(
    `SELECT last_run FROM maintenance_state WHERE key='audit_cleanup'`,
    { plain: false }
  );
  const lastRun = rows?.[0]?.last_run ? new Date(rows[0].last_run) : null;
  const needRun = !lastRun || (Date.now() - lastRun.getTime() > 24 * 3600e3);

  if (!needRun) return;

  // 3) Удаление — в транзакции
  const t = await sequelize.transaction();
  try {
    const [res] = await sequelize.query(
      `DELETE FROM audit_logs
       WHERE "createdAt" < NOW() - (:days || ' days')::interval`,
      { replacements: { days: String(DAYS) }, transaction: t }
    );
    await t.commit();

    logger.info({ deleted: res?.rowCount ?? null, days: DAYS },
      '[retention] catch-up delete done');
  } catch (e) {
    await t.rollback();
    logger.error({ err: e }, '[retention] catch-up delete failed');
    return;
  }

  // 4) VACUUM — строго вне транзакции
  try {
    await sequelize.query('VACUUM (ANALYZE) audit_logs;');
  } catch (e) {
    logger.warn({ err: e }, '[retention] vacuum warn');
  }

  // 5) Запоминаем успешный запуск
  await sequelize.query(
    `INSERT INTO maintenance_state (key, last_run)
     VALUES ('audit_cleanup', NOW())
     ON CONFLICT (key) DO UPDATE SET last_run = EXCLUDED.last_run`
  );
}
