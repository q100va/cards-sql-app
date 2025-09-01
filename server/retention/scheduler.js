// server/retention/scheduler.js
import cron from 'node-cron';
import sequelize from '../database.js';
import logger from '../logging/logger.js';

export function scheduleAuditCleanup() {
  cron.schedule('15 3 * * *', async () => {
    try {
      // delete в транзакции
      const t = await sequelize.transaction();
      await sequelize.query(
        `DELETE FROM audit_logs
         WHERE "createdAt" < NOW() - (:days || ' days')::interval`,
        { replacements: { days: String(process.env.AUDIT_RETENTION_DAYS || '180') }, transaction: t }
      );
      await t.commit();

      // vacuum — отдельно
      await sequelize.query('VACUUM (ANALYZE) audit_logs;');

      logger.info('[cron] audit cleanup done');
    } catch (e) {
      logger.error({ err: e }, '[cron] audit cleanup failed');
    }
  }, { timezone: 'America/New_York' });
}
