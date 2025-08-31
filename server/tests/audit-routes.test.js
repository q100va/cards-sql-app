import request from 'supertest';
import { jest } from "@jest/globals";
import express from 'express';
import Sequelize from 'sequelize';
import { handleError } from '../middlewares/error-handler.js';
const { Op } = Sequelize;

jest.unstable_mockModule('../models/index.js', () => ({
  AuditLog: {
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));

jest.unstable_mockModule('../middlewares/validate-request.js', () => ({
  validateRequest: () => (_req, _res, next) => next(), // пропускаем валидацию в юните
}));

// теперь можно импортировать тестируемый роут и модель
const { default: auditRouter } = await import('../routes/audit-api.js');
const { AuditLog } = await import('../models/index.js');

function makeApp() {
  const app = express();
  app.use('/api/audit', auditRouter);
  app.use(handleError);
  return app;
}

describe('GET /api/audit (Jest + supertest)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('defaults: limit=10, offset=0, no filters', async () => {
    AuditLog.findAll.mockResolvedValueOnce([{ id: 1 }]);
    AuditLog.count.mockResolvedValueOnce(1);

    const res = await request(makeApp()).get('/api/audit');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.rows).toEqual([{ id: 1 }]);
    expect(res.body.data.count).toBe(1);

    const args = AuditLog.findAll.mock.calls[0][0];
    expect(args.limit).toBe(10);
    expect(args.offset).toBe(0);
    expect(args.where).toEqual({});
    expect(args.order).toEqual([['createdAt', 'DESC'], ['id', 'DESC']]);
  });

  test('applies filters + paging + date range', async () => {
    AuditLog.findAll.mockResolvedValueOnce([]);
    AuditLog.count.mockResolvedValueOnce(0);

    const from = '2025-08-01T00:00:00.000Z';
    const to = '2025-08-03T00:00:00.000Z';

    const res = await request(makeApp())
      .get('/api/audit')
      .query({
        model: 'role',
        action: 'update',
        entityId: '42',
        userId: '7',
        correlationId: 'cid-123',
        from, to,
        limit: 25,
        offset: 50,
      });

    expect(res.statusCode).toBe(200);

    const args = AuditLog.findAll.mock.calls[0][0];
    expect(args.limit).toBe(25);
    expect(args.offset).toBe(50);
    expect(args.where).toMatchObject({
      model: 'role',
      action: 'update',
      entityId: '42',
      actorUserId: '7',
      correlationId: 'cid-123',
    });
    expect(args.where.createdAt[Op.gte]).toBeInstanceOf(Date);
    expect(args.where.createdAt[Op.lte]).toBeInstanceOf(Date);
    expect(args.where.createdAt[Op.gte].toISOString()).toBe(from);
    expect(args.where.createdAt[Op.lte].toISOString()).toBe(to);
  });

  test('caps limit at 100', async () => {
    AuditLog.findAll.mockResolvedValueOnce([]);

    await request(makeApp()).get('/api/audit').query({ limit: 999, offset: 0 });

    const args = AuditLog.findAll.mock.calls[0][0];
    expect(args.limit).toBe(100);
  });

  test('handles DB error via error handler', async () => {
    AuditLog.findAll.mockRejectedValueOnce(new Error('db down'));
    AuditLog.count.mockResolvedValueOnce(0);

    const res = await request(makeApp()).get('/api/audit');

    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body).toMatchObject({
      message: 'Произошла ошибка. Данные не получены.'
    });
    expect('correlationId' in res.body).toBe(true);
  });
});
