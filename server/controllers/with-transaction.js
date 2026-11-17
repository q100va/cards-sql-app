import sequelize from '../database.js';

/**
 * Runs the callback inside a managed Sequelize transaction.
 * Sequelize commits on success and rolls back automatically on error.
 */
export async function withTransaction(
  callback,
) {
  return sequelize.transaction(
    async (transaction) =>
      callback(transaction),
  );
}
