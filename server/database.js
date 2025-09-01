import { Sequelize } from 'sequelize';
import 'dotenv/config';

const user = process.env.DB_USERNAME ?? '';
const pass = process.env.DB_PASSWORD ?? '';
const host = process.env.DB_LINK ?? '127.0.0.1:5432/dev_db';

const url =
  `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}`;

const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  logging: false,
});

export default sequelize;
