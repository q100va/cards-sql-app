//import dotenv from 'dotenv';
//dotenv.config({ path: 'server/.env.test' });
import request from 'supertest';
import app, { initInfrastructure } from '../../app.js';
import sequelize from '../../database.js';

beforeAll(async () => {
  await initInfrastructure();           // гарантируем, что таблицы есть
  global.api = request(app);
});

beforeEach(async () => {
  await sequelize.truncate({ cascade: true, restartIdentity: true });
});

afterAll(async () => {
  await sequelize.close(); // закрываем пул
});



