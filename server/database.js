import { Sequelize } from 'sequelize';
import 'dotenv/config';

const isTest = process.env.NODE_ENV === 'test';
const prodUrl = process.env.DATABASE_URL; // Neon

const user = process.env.DB_USERNAME ?? '';
const pass = process.env.DB_PASSWORD ?? '';
const host = isTest ? process.env.DB_LINK_TEST : process.env.DB_LINK;
const localUrl = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}`;

const connectionString = (!isTest && prodUrl) ? prodUrl : localUrl;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: (!isTest && prodUrl)
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  logging: false,
});

export default sequelize;

