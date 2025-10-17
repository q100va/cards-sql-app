// tests/int/helpers/sql.js
import sequelize from '../../../database.js';
import { QueryTypes } from 'sequelize';

export async function select(text, bind = []) {
  // Minimal helper to run raw SELECT and get an array of rows.
  return sequelize.query(text, { bind, type: QueryTypes.SELECT });
}
