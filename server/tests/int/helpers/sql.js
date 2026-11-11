import { QueryTypes } from 'sequelize';

import sequelize from '../../../database.js';

export async function select(
  text,
  bind = [],
) {
  return sequelize.query(text, {
    bind,
    type: QueryTypes.SELECT,
  });
}
