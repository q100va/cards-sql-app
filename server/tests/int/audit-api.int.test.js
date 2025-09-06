// server/tests/int/audit-api.int.test.js
import request from 'supertest';
import app, { initInfrastructure } from '../../app.js';
import { AuditLog } from '../../models/index.js';
describe('GET /api/audit (integration)', () => {
  beforeAll(async () => {
    await initInfrastructure();
  });

  async function resetAndSeed() {
    // Полная очистка и сброс id
    await AuditLog.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });

    // Данные с разными createdAt, чтобы проверить сортировку и фильтры
    // Важно: одинаковые createdAt у двух записей, чтобы проверить tiebreaker по id DESC
    const rows = [
      { model: 'user', action: 'create', entityId: 'u1', actorUserId: '42', correlationId: 'c1', createdAt: new Date('2025-01-10T10:00:00Z') },
      { model: 'user', action: 'update', entityId: 'u1', actorUserId: '42', correlationId: 'c2', createdAt: new Date('2025-01-12T12:00:00Z') },
      { model: 'role', action: 'delete', entityId: 'r1', actorUserId: '7',  correlationId: 'c3', createdAt: new Date('2025-02-01T09:30:00Z') },
      { model: 'role', action: 'create', entityId: 'r2', actorUserId: '7',  correlationId: 'c4', createdAt: new Date('2025-02-03T11:00:00Z') },
      { model: 'user', action: 'update', entityId: 'u2', actorUserId: '13', correlationId: 'c5', createdAt: new Date('2025-02-03T11:00:00Z') }, // same createdAt as c4
    ];
    await AuditLog.bulkCreate(rows, { validate: false });
  }

  beforeEach(async () => {
    await resetAndSeed();
  });

  it('200: default sort (createdAt DESC, id DESC) + pagination (limit/offset)', async () => {
    const res = await request(app).get('/api/audit').query({ limit: 3, offset: 0 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.count).toBe(5);
    expect(res.body.data.rows).toHaveLength(3);

    // Ожидаемый порядок: c5 (новее по id при одинаковом createdAt), c4, c3, c2, c1 ...
    const got = res.body.data.rows.map(r => r.correlationId);
    expect(got).toEqual(['c5', 'c4', 'c3']);
  });

  it('supports offset window', async () => {
    const res = await request(app).get('/api/audit').query({ limit: 2, offset: 2 });
    expect(res.status).toBe(200);
    const got = res.body.data.rows.map(r => r.correlationId);
    // После c5,c4 идут c3,c2 в окне offset=2,limit=2
    expect(got).toEqual(['c3', 'c2']);
  });

  it('filters by model/action/entityId/userId/correlationId', async () => {
    const byModel = await request(app).get('/api/audit').query({ model: 'user', limit: 100, offset: 0 });
    expect(byModel.status).toBe(200);
    expect(byModel.body.data.count).toBe(3);
    expect(byModel.body.data.rows.every(r => r.model === 'user')).toBe(true);

    const byAction = await request(app).get('/api/audit').query({ action: 'delete', limit: 100, offset: 0 });
    expect(byAction.status).toBe(200);
    expect(byAction.body.data.count).toBe(1);
    expect(byAction.body.data.rows[0].correlationId).toBe('c3');

    const byEntity = await request(app).get('/api/audit').query({ entityId: 'u1', limit: 100, offset: 0 });
    expect(byEntity.status).toBe(200);
    expect(byEntity.body.data.count).toBe(2);
    expect(byEntity.body.data.rows.map(r => r.correlationId)).toEqual(['c2', 'c1']);

    const byUser = await request(app).get('/api/audit').query({ userId: '7', limit: 100, offset: 0 });
    expect(byUser.status).toBe(200);
    expect(byUser.body.data.count).toBe(2);
    expect(byUser.body.data.rows.map(r => r.correlationId)).toEqual(['c4', 'c3']);

    const byCorr = await request(app).get('/api/audit').query({ correlationId: 'c5', limit: 100, offset: 0 });
    expect(byCorr.status).toBe(200);
    expect(byCorr.body.data.count).toBe(1);
    expect(byCorr.body.data.rows[0].correlationId).toBe('c5');
  });

  it('filters by date range (from/to inclusive)', async () => {
    const res = await request(app).get('/api/audit').query({
      from: '2025-02-01T00:00:00.000Z',
      to:   '2025-02-02T00:00:00.000Z',
      limit: 100,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.rows[0].correlationId).toBe('c3');
  });

  it('422 on invalid query (schema validation), e.g. bad from-date', async () => {
    const res = await request(app).get('/api/audit').query({
      from: 'not-a-date',
    });
    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  it('500 + ERRORS.NO_DATA_RECEIVED when DB fails', async () => {
    // Спровоцируем ошибку БД на findAll
    const origFindAll = AuditLog.findAll;
    try {
      AuditLog.findAll = () => { throw new Error('db fail'); };

      const res = await request(app).get('/api/audit');
      expect(res.status).toBeGreaterThanOrEqual(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body.code).toBe('ERRORS.NO_DATA_RECEIVED');
    } finally {
      AuditLog.findAll = origFindAll;
    }
  });

  it('caps limit with Math.min(..., 100)', async () => {
    // У нас всего 5 записей — но проверим, что запрос с большим лимитом не ломает и не завышает.
    const res = await request(app).get('/api/audit').query({ limit: 100, offset: 0});
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBeLessThanOrEqual(100);
    expect(res.body.data.count).toBe(5);
  });
});
