// tests/int/require-permission.int.test.js
import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { requireOperation } from '../../middlewares/require-permission.js';
import {RolePermission} from '../../models/index.js';

const makeApp = () => {
  const app = express();
  // Заглушка auth: пользователь с roleId=1
  app.use((req, _res, next) => { req.user = { roleId: 1 }; next(); });
  app.patch('/update-role', requireOperation('EDIT_ROLE'), (_req, res) => res.json({ ok: true }));
  // Простой error handler
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ code: err.code || null, message: err.message }));
  return app;
};

describe('requireOperation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('403 when permission missing', async () => {
    jest.spyOn(RolePermission, 'findOne').mockResolvedValue(null);
    const res = await request(makeApp()).patch('/update-role');
    expect(res.status).toBe(403);
  });

  it('200 when permission granted', async () => {
    jest.spyOn(RolePermission, 'findAll').mockResolvedValue([{ id: 123, access: true, disabled: false, name: 'EDIT_ROLE'}]);
    const res = await request(makeApp()).patch('/update-role');
    expect(res.status).toBe(200);
  });
});
