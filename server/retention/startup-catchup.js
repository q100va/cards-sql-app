import sequelize from '../database.js';
import {
  cleanupAuditLogs,
} from './audit-cleanup.js';

const CATCH_UP_INTERVAL_MS =
  24 * 60 * 60 * 1000;

// Stores the last successful audit cleanup time.
const STATE_SQL = `
  CREATE TABLE IF NOT EXISTS maintenance_state (
    key text PRIMARY KEY,
    last_run timestamptz NOT NULL
  );
`;

export async function runAuditCleanupCatchUp() {
  await sequelize.query(STATE_SQL);

  const [rows] = await sequelize.query(
    `SELECT last_run
     FROM maintenance_state
     WHERE key = 'audit_cleanup'`,
  );

  const lastRunValue =
    rows?.[0]?.last_run ?? null;

  const lastRun =
    lastRunValue
      ? new Date(lastRunValue)
      : null;

  const needsCleanup =
    !lastRun ||
    Number.isNaN(lastRun.getTime()) ||
    Date.now() - lastRun.getTime() >=
      CATCH_UP_INTERVAL_MS;

  if (!needsCleanup) {
    return;
  }

  await cleanupAuditLogs();
}
