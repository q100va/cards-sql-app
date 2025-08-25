import sequelize from '../database.js';

export async function withTransaction(callback) {
  const t = await sequelize.transaction();
  try {
    const result = await callback(t); // передаем транзакцию в callback
    await t.commit(); // подтверждаем изменения
    return result;
  } catch (err) {
    await t.rollback(); // откатываем при ошибке
    throw err;
  }
}
