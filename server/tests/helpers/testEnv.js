import request from 'supertest';
import app, { initInfrastructure } from '../../app.js';
//import { dbConnect, dbDisconnect, begin, rollback } from './db.js'; // если используешь свою обёртку

beforeAll(async () => {
  // если у тебя dbConnect уже делает sequelize.authenticate — достаточно initInfrastructure()
  await initInfrastructure();       // синк моделей, без listen
  global.api = request(app);        // <-- теперь точно есть
});

/* beforeEach(async () => {
  await begin();   // BEGIN;
});

afterEach(async () => {
  await rollback(); // ROLLBACK;
});

afterAll(async () => {
  await dbDisconnect?.(); // если есть
}); */
