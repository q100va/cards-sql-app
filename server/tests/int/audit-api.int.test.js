import jwt from 'jsonwebtoken';

import { AuditLog } from '../../models/index.js';

import { createRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'audit-integration-user', role: 'AUDIT_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedToken() {
  const role = await createRole({ name: 'Audit Test Role' });

  await createOperation({ roleId: role.id, name: 'VIEW_AUDIT_LOG', access: true, disabled: false });

  const token = makeAccessToken(role.id);

  // Role/permission creation may itself be audited.
  // Remove setup noise before testing the audit endpoint.
  await AuditLog.destroy({ truncate: true, restartIdentity: true });

  return token;
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

function diffFor(action) {
  if (action === 'update') {
    return { changed: { name: ['Old', 'New'] } };
  }

  if (action === 'delete') {
    return { before: { id: 1 } };
  }

  if (action === 'auth') {
    return { event: 'login_success' };
  }

  return { after: { id: 1 } };
}

async function createAuditLog(overrides = {}) {
  const action = overrides.action ?? 'create';

  return AuditLog.create({
    action,
    model: 'user',
    entityId: '1',
    diff: diffFor(action),
    actorUserId: 10,
    correlationId: 'corr-default',
    ip: '127.0.0.1',
    userAgent: 'audit-api-integration-test',
    ...overrides,
  });
}

describe('GET /api/audit', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api.get('/api/audit');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks VIEW_AUDIT_LOG', async () => {
    const role = await createRole({ name: 'No Audit Access Role' });

    const token = makeAccessToken(role.id);

    const res = await auth(global.api.get('/api/audit'), token);

    expect(res.status).toBe(403);
  });

  test('returns 422 when query validation fails', async () => {
    const token = await createAuthorizedToken();

    const res = await auth(global.api.get('/api/audit'), token).query({ action: 'invalid-action' });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('returns audit rows ordered from newest to oldest', async () => {
    const token = await createAuthorizedToken();

    await createAuditLog({ entityId: 'oldest', createdAt: new Date('2026-01-01T10:00:00.000Z') });

    await createAuditLog({ entityId: 'newest', createdAt: new Date('2026-01-03T10:00:00.000Z') });

    await createAuditLog({ entityId: 'middle', createdAt: new Date('2026-01-02T10:00:00.000Z') });

    const res = await auth(global.api.get('/api/audit'), token);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(3);
    expect(res.body.data.rows.map((row) => row.entityId)).toEqual(['newest', 'middle', 'oldest']);
  });

  test('filters by model, action, entity, user, and correlation id', async () => {
    const token = await createAuthorizedToken();

    await createAuditLog({
      action: 'update',
      model: 'user',
      entityId: '42',
      actorUserId: 7,
      correlationId: 'corr-target',
      diff: { changed: { name: ['Before', 'After'] } },
    });

    await createAuditLog({
      action: 'create',
      model: 'role',
      entityId: '99',
      actorUserId: 8,
      correlationId: 'corr-other',
    });

    const res = await auth(global.api.get('/api/audit'), token).query({
      model: 'user',
      action: 'update',
      entityId: '42',
      userId: 7,
      correlationId: 'corr-target',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.rows).toHaveLength(1);
    expect(res.body.data.rows[0]).toMatchObject({
      action: 'update',
      model: 'user',
      entityId: '42',
      actorUserId: 7,
      correlationId: 'corr-target',
    });
  });

  test('filters audit rows by date range', async () => {
    const token = await createAuthorizedToken();

    await createAuditLog({
      entityId: 'before-range',
      createdAt: new Date('2026-02-01T12:00:00.000Z'),
    });

    await createAuditLog({
      entityId: 'inside-range',
      createdAt: new Date('2026-02-02T12:00:00.000Z'),
    });

    await createAuditLog({
      entityId: 'after-range',
      createdAt: new Date('2026-02-03T12:00:00.000Z'),
    });

    const res = await auth(global.api.get('/api/audit'), token).query({
      from: '2026-02-02T00:00:00.000Z',
      to: '2026-02-02T23:59:59.999Z',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.rows).toHaveLength(1);
    expect(res.body.data.rows[0].entityId).toBe('inside-range');
  });

  test('applies limit and offset while count remains the total', async () => {
    const token = await createAuthorizedToken();

    await createAuditLog({ entityId: 'first', createdAt: new Date('2026-03-01T10:00:00.000Z') });

    await createAuditLog({ entityId: 'second', createdAt: new Date('2026-03-02T10:00:00.000Z') });

    await createAuditLog({ entityId: 'third', createdAt: new Date('2026-03-03T10:00:00.000Z') });

    const res = await auth(global.api.get('/api/audit'), token).query({ limit: 1, offset: 1 });

    expect(res.status).toBe(200);

    // Count is the total matching rows,
    // not the number on this page.
    expect(res.body.data.count).toBe(3);
    expect(res.body.data.rows).toHaveLength(1);
    expect(res.body.data.rows[0].entityId).toBe('second');
  });
});
