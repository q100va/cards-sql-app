// server/tests/int/audit-api.int.test.js
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const JWT_SECRET = 'acc-secret';
process.env.JWT_ACCESS_SECRET = JWT_SECRET; // ✅ до импортов

let app, initInfrastructure, AuditLog, RolePermission;
let token;

function makeToken() {
  return jwt.sign(
    { sub: '1', uname: 'tester', role: 'ADMIN', roleId: 1 },
    JWT_SECRET,
    { issuer: 'cards-sql-app', audience: 'web', expiresIn: 3600 }
  );
}

beforeEach(async () => {
  jest.resetModules();

  // Изолируем загрузку модулей после установки env
  await jest.isolateModulesAsync(async () => {
    ({ default: app, initInfrastructure } = await import('../../app.js'));
    ({ Role, AuditLog, RolePermission } = await import('../../models/index.js'));
  });

  await initInfrastructure();

  await Role.findOrCreate({
    where: { id: 1 },
    defaults: { name: 'ADMIN', description: 'test-admin' },
  });
  await seedPermission();
  await seedAudit();

  token = makeToken();
});

function authGet(url) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}

async function seedAudit() {
  await AuditLog.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
  await AuditLog.bulkCreate(
    [
      { model: 'user', action: 'create', entityId: 'u1', actorUserId: '42', correlationId: 'c1', createdAt: new Date('2025-01-10T10:00:00Z') },
      { model: 'user', action: 'update', entityId: 'u1', actorUserId: '42', correlationId: 'c2', createdAt: new Date('2025-01-12T12:00:00Z') },
      { model: 'role', action: 'delete', entityId: 'r1', actorUserId: '7', correlationId: 'c3', createdAt: new Date('2025-02-01T09:30:00Z') },
      { model: 'role', action: 'create', entityId: 'r2', actorUserId: '7', correlationId: 'c4', createdAt: new Date('2025-02-03T11:00:00Z') },
      { model: 'user', action: 'update', entityId: 'u2', actorUserId: '13', correlationId: 'c5', createdAt: new Date('2025-02-03T11:00:00Z') },
    ],
    { validate: false }
  );
}

async function seedPermission() {
  // право, требуемое роутом: requireOperation('VIEW_FULL_ROLES_LIST')
  await RolePermission.destroy({
    where: { roleId: 1, name: 'VIEW_FULL_ROLES_LIST' }
  });

  await RolePermission.create({
    roleId: 1,
    name: 'VIEW_FULL_ROLES_LIST',
    access: true,
    disabled: false,
  });
  // sanity check – тот же экземпляр модели должен видеть запись
  const rows = await RolePermission.findAll({
    where: { roleId: 1, name: { [Op.in]: ['VIEW_FULL_ROLES_LIST'] }, access: true },
    raw: true,
  });
  if (rows.length === 0) {
    throw new Error('Seeded permission not found via RolePermission.findAll()');
  }
}

beforeEach(async () => {
  //await seedAudit();
  //await seedPermission();
});


it('200: default sort (createdAt DESC, id DESC) + pagination', async () => {
  const res = await authGet('/api/audit').query({ limit: 3, offset: 0 });
  expect(res.status).toBe(200);
  expect(res.body.data.count).toBe(5);
  expect(res.body.data.rows.map(r => r.correlationId)).toEqual(['c5', 'c4', 'c3']);
});

 it('supports offset window', async () => {
  const res = await authGet('/api/audit').query({ limit: 2, offset: 2 });
  expect(res.status).toBe(200);
  expect(res.body.data.rows.map(r => r.correlationId)).toEqual(['c3', 'c2']);
});

it('filters by model/action/entityId/userId/correlationId', async () => {
  const byModel = await authGet('/api/audit').query({ model: 'user', limit: 100, offset: 0 });
  expect(byModel.status).toBe(200);
  expect(byModel.body.data.count).toBe(3);
  expect(byModel.body.data.rows.every(r => r.model === 'user')).toBe(true);

  const byAction = await authGet('/api/audit').query({ action: 'delete', limit: 100, offset: 0 });
  expect(byAction.status).toBe(200);
  expect(byAction.body.data.count).toBe(1);
  expect(byAction.body.data.rows[0].correlationId).toBe('c3');

  const byEntity = await authGet('/api/audit').query({ entityId: 'u1', limit: 100, offset: 0 });
  expect(byEntity.status).toBe(200);
  expect(byEntity.body.data.count).toBe(2);
  expect(byEntity.body.data.rows.map(r => r.correlationId)).toEqual(['c2', 'c1']);

  const byUser = await authGet('/api/audit').query({ userId: '7', limit: 100, offset: 0 });
  expect(byUser.status).toBe(200);
  expect(byUser.body.data.count).toBe(2);
  expect(byUser.body.data.rows.map(r => r.correlationId)).toEqual(['c4', 'c3']);

  const byCorr = await authGet('/api/audit').query({ correlationId: 'c5', limit: 100, offset: 0 });
  expect(byCorr.status).toBe(200);
  expect(byCorr.body.data.count).toBe(1);
  expect(byCorr.body.data.rows[0].correlationId).toBe('c5');
});

it('filters by date range (from/to inclusive)', async () => {
  const res = await authGet('/api/audit').query({
    from: '2025-02-01T00:00:00.000Z',
    to: '2025-02-02T00:00:00.000Z',
    limit: 100,
  });
  expect(res.status).toBe(200);
  expect(res.body.data.count).toBe(1);
  expect(res.body.data.rows[0].correlationId).toBe('c3');
});

it('422 on invalid query (schema validation)', async () => {
  const res = await authGet('/api/audit').query({ from: 'not-a-date' });
  expect(res.status).toBe(422);
  expect(res.headers['content-type']).toMatch(/application\/json/i);
  expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
});

it('500 + ERRORS.NO_DATA_RECEIVED when DB fails', async () => {
  const orig = AuditLog.findAll;
  try {
    AuditLog.findAll = () => { throw new Error('db fail'); };
    const res = await authGet('/api/audit');
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.code).toBe('ERRORS.NO_DATA_RECEIVED');
  } finally {
    AuditLog.findAll = orig;
  }
});

/* it('caps limit at 100', async () => {
  const res = await authGet('/api/audit').query({ limit: 100, offset: 0 });
  expect(res.status).toBe(200);
  expect(res.body.data.rows.length).toBeLessThanOrEqual(100);
  expect(res.body.data.count).toBe(5);
}); */

