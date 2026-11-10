import cron from 'node-cron';
import logger from '../logging/logger.js';
import {
  cleanupAuditLogs,
} from './audit-cleanup.js';

export function scheduleAuditCleanup() {
  return cron.schedule(
    '15 3 * * *',
    async () => {
      try {
        await cleanupAuditLogs();
      } catch (error) {
        logger.error(
          { err: error },
          '[retention] scheduled audit cleanup failed',
        );
      }
    },
    {
      timezone: 'America/New_York',
    },
  );
}
