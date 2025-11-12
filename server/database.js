import { Sequelize } from 'sequelize';
import 'dotenv/config';

const isTest = process.env.NODE_ENV === 'test';
<<<<<<< HEAD
const prodUrl = process.env.DATABASE_URL; // Neon
=======
const isProd = process.env.NODE_ENV === 'production';//true;//
>>>>>>> c02a0aa00e1d05a96316af868c67cf567dea0361

const user = process.env.DB_USERNAME ?? '';
const pass = process.env.DB_PASSWORD ?? '';
const host = isTest ? process.env.DB_LINK_TEST : process.env.DB_LINK;
const localUrl = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}`;
<<<<<<< HEAD

const connectionString = (!isTest && prodUrl) ? prodUrl : localUrl;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: (!isTest && prodUrl)
=======
const prodUrl = process.env.DATABASE_URL; // Neon

const connectionString = (isProd) ? prodUrl : localUrl;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: (isProd)
>>>>>>> c02a0aa00e1d05a96316af868c67cf567dea0361
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  logging: false,
});

export default sequelize;
<<<<<<< HEAD
=======

>>>>>>> c02a0aa00e1d05a96316af868c67cf567dea0361
