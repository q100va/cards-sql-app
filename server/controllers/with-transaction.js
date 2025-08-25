// Wraps a callback in a DB transaction and ensures proper commit/rollback.
// - Starts a new Sequelize transaction
// - Passes the transaction object to the callback
// - Commits on success, rolls back on error
// - Re-throws the original error so callers can handle it upstream
// controllers/with-transaction.js
import sequelize from '../database.js';

export async function withTransaction(callback) {
  const t = await sequelize.transaction();
  try {
    const result = await callback(t);
    await t.commit();
    return result;
  } catch (err) {
    // If callback fails, rollback
    try { await t.rollback(); } catch { /* swallow rollback error */ }
    throw err;
  }
}
