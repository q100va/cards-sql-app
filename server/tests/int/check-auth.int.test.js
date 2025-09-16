/* @jest-environment node */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const mwPath = path.resolve(__dirname, '../../middlewares/check-auth.js');

function makeToken({ id = 1, userName = 'user', role = 'USER', exp = null } = {}, secret = 'acc') {
  const payload = { sub: String(id), uname: userName, role };
  const opts = { issuer: 'cards-sql-app', audience: 'web', expiresIn: '1h' };
  if (typeof exp === 'number') { delete opts.expiresIn; payload.exp = exp; }
  return jwt.sign(payload, secret, opts);
}

describe('integration: requireAuth / optionalAuth', () => {
  afterEach(() => { jest.resetModules(); });

  test('requireAuth: 200 с валидным токеном, 401 без/битого токена', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.JWT_ACCESS_SECRET = 'acc';
      const { requireAuth, optionalAuth } = await import(mwPath);

      const app = express();
      app.get('/protected', requireAuth, (req, res) => res.json({ ok: true, user: req.user }));
      app.get('/optional', optionalAuth, (req, res) => res.json({ ok: true, user: req.user ?? null }));

      const good = makeToken({ id: 77, userName: 'Zoe', role: 'ADMIN' }, 'acc');
      await request(app).get('/protected').set('Authorization', `Bearer ${good}`).expect(200);

      await request(app).get('/protected').expect(401);
      const bad = makeToken({}, 'wrong');
      await request(app).get('/protected').set('Authorization', `Bearer ${bad}`).expect(401);

      // optionalAuth: всегда 200; при плохом токене user не ставится
      const r1 = await request(app).get('/optional').expect(200);
      expect(r1.body.user).toBeNull();

      const r2 = await request(app).get('/optional').set('Authorization', `Bearer ${good}`).expect(200);
      expect(r2.body.user).toMatchObject({ id: 77, userName: 'Zoe', role: 'ADMIN' });
    });
  });
});
