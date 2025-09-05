import { Sequelize } from 'sequelize';
import 'dotenv/config';

const isTest = process.env.NODE_ENV === 'test';

const user = process.env.DB_USERNAME ?? '';
const pass = process.env.DB_PASSWORD ?? '';
//const host = process.env.DB_LINK ?? '127.0.0.1:5432/dev_db';
const host = isTest ? process.env.DB_LINK_TEST : process.env.DB_LINK;

console.log('host', host);

const url =
  `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}`;

const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  logging: false,
});

export default sequelize;


