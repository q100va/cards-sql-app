/* @jest-environment node */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';

const AuditLog = {
  findAll: jest.fn(),
  count: jest.fn(),
};

jest.unstable_mockModule('../../models/index.js', () => ({ AuditLog }));

jest.unstable_mockModule('../../middlewares/check-auth.js', () =>
({
  default: (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../middlewares/require-permission.js', () =>
({
  requireOperation: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../middlewares/validate-request.js', () =>
({
  validateRequest: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../../shared/dist/schemas/audit.schema.js', () =>
({
  auditQuerySchema: {},
}));

const { default: auditRouter } = await import('../../routes/audit-api.js');

function makeApp() {
  const app = express();

  app.use('/api/audit', auditRouter);

  // Error-handler behavior is tested
  // separately. Here we only inspect
  // what error the route passes onward.
  app.use((error, _req, res, _next) => {
    res.status(error.status ?? 500).json({ code: error.code ?? 'ERRORS.INTERNAL' });
  });

  return app;
}

describe('GET /api/audit', () => {
  beforeEach(() => {
    AuditLog.findAll.mockReset();

    AuditLog.count.mockReset();
  });

  test('returns audit rows and total count', async () => {
    AuditLog.findAll.mockResolvedValue([
      {
        id: 1,
        action: 'update',
      },
    ]);

    AuditLog.count.mockResolvedValue(1);

    const response = await request(makeApp()).get('/api/audit').expect(200);

    expect(response.body).toEqual({
      data: {
        rows: [
          {
            id: 1,
            action: 'update',
          },
        ],
        count: 1,
      },
    });

    expect(AuditLog.findAll).toHaveBeenCalledTimes(1);

    expect(AuditLog.count).toHaveBeenCalledTimes(1);

    const query = AuditLog.findAll.mock.calls[0][0];

    expect(query.where).toEqual({});

    expect(query.order).toEqual([['createdAt', 'DESC'], ['id', 'DESC']]);

    expect(query.raw).toBe(true);

    expect(AuditLog.count).toHaveBeenCalledWith({ where: {} });
  });

  test('builds filters from query parameters', async () => {
    AuditLog.findAll.mockResolvedValue([]);

    AuditLog.count.mockResolvedValue(0);

    const from = '2025-08-01T00:00:00.000Z';

    const to = '2025-08-03T00:00:00.000Z';

    await request(makeApp()).get('/api/audit').query({
      model: 'role',
      action: 'update',
      entityId: '42',
      userId: '7',
      correlationId: 'cid-123',
      from,
      to,
      limit: 25,
      offset: 50,
    }).expect(200);

    const query = AuditLog.findAll.mock.calls[0][0];

    expect(query.where).toMatchObject({
      model: 'role',
      action: 'update',
      entityId: '42',
      actorUserId: '7',
      correlationId: 'cid-123',
    });

    expect(query.where.createdAt[Op.gte]).toBe(from);

    expect(query.where.createdAt[Op.lte]).toBe(to);

    // Validation is mocked here,
    // so Express query values remain
    // strings. Coercion belongs to
    // schema validation tests.
    expect(query.limit).toBe('25');

    expect(query.offset).toBe('50');

    expect(AuditLog.count).toHaveBeenCalledWith({ where: query.where });
  });

  test('supports one-sided date ranges', async () => {
    AuditLog.findAll.mockResolvedValue([]);

    AuditLog.count.mockResolvedValue(0);

    const from = '2025-08-01T00:00:00.000Z';

    await request(makeApp()).get('/api/audit').query({ from }).expect(200);

    const where = AuditLog.findAll.mock.calls[0][0].where;

    expect(where.createdAt[Op.gte]).toBe(from);

    expect(where.createdAt[Op.lte]).toBeUndefined();
  });

  test('passes database errors onward as DATA_FETCH_FAILED', async () => {
    const dbError = new Error('db down');

    AuditLog.findAll.mockRejectedValue(dbError);

    AuditLog.count.mockResolvedValue(0);

    const response = await request(makeApp()).get('/api/audit').expect(500);

    expect(response.body).toEqual({ code: 'ERRORS.DATA_FETCH_FAILED' });

    expect(dbError.code).toBe('ERRORS.DATA_FETCH_FAILED');
  });
});
