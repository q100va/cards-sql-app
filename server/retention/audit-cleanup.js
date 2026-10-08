import sequelize from '../database.js';
import logger from '../logging/logger.js';

const DEFAULT_RETENTION_DAYS = 180;

export function getAuditRetentionDays() {
  const value = Number.parseInt(
    process.env.AUDIT_RETENTION_DAYS ??
      String(DEFAULT_RETENTION_DAYS),
    10,
  );

  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_RETENTION_DAYS;
}

export async function cleanupAuditLogs() {
  const days = getAuditRetentionDays();

  await sequelize.transaction(
    async (transaction) => {
      await sequelize.query(
        `DELETE FROM audit_logs
         WHERE "createdAt" <
           NOW() - (:days || ' days')::interval`,
        {
          replacements: {
            days: String(days),
          },
          transaction,
        },
      );

      await sequelize.query(
        `INSERT INTO maintenance_state (
           key,
           last_run
         )
         VALUES (
           'audit_cleanup',
           NOW()
         )
         ON CONFLICT (key)
         DO UPDATE
         SET last_run = EXCLUDED.last_run`,
        {
          transaction,
        },
      );
    },
  );

  logger.info(
    { days },
    '[retention] audit cleanup done',
  );
}
