import 'dotenv/config';
import jwt from 'jsonwebtoken';
import sequelize from '../../database.js';
import { QueryTypes, Op } from 'sequelize';

import { beforeEach } from '@jest/globals';
import { createRole } from './factories/role.js';
import { createUser as factoryCreateUser } from './factories/user.js';
import { createUserHashed } from './factories/user.js';
import { seedOperationsForRole } from './factories/role.js';
import { Role, RolePermission, User, UserContact, UserAddress, SearchUser, RefreshToken } from '../../models/index.js';

// маленький хелпер для SELECT-ов (возвращает массив строк)
async function select(text, bind = []) {
  return sequelize.query(text, { bind, type: QueryTypes.SELECT });
}

describe('Users API (integration, minimal)', () => {
  const langRu = { 'x-lang': 'ru' };
  let auth = {};

  beforeAll(async () => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not set (check .env.test)');

    // check-auth.js ожидает issuer/audience и поля payload:
    const token = jwt.sign(
      { sub: '1', uname: 'superAdmin', role: 'ADMIN', roleId: 1 },
      secret,
      { issuer: 'cards-sql-app', audience: 'web', expiresIn: '15m' }
    );

    auth = { Authorization: `Bearer ${token}` };
  });

  beforeEach(async () => {
    // чистим хвосты пользователей (каскады и индексы)
    await RefreshToken.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    await SearchUser.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    await UserContact.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    await UserAddress.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    await User.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });

    // роль 1 и её операции
    await Role.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    const role = await createRole({ name: 'ADMIN', description: 'test-admin' });
    await RolePermission.destroy({ where: { roleId: role.id } });
    await seedOperationsForRole(role.id);

    // минимальный набор прав для тестируемых ручек
    const perms = [
      'ADD_NEW_USER', 'EDIT_USER', 'VIEW_USER', 'VIEW_LIMITED_USERS_LIST',
      'DELETE_USER', 'BLOCK_USER', 'UNBLOCK_USER', 'CHANGE_USER_PASSWORD'
    ];
    await RolePermission.update(
      { access: true },
      { where: { roleId: role.id, name: { [Op.in]: perms } } }
    );
    const rows = await RolePermission.findAll({ where: { roleId: role.id, access: true }, raw: true });
    if (rows.length === 0) throw new Error('Seeded permission not found via RolePermission.findAll()');
  });

  // ---------- GET /check-user-name ----------
  describe('GET /api/users/check-user-name', () => {
    it('returns {data:true, code:USER.ALREADY_EXISTS} when userName taken (case-insensitive)', async () => {
      await factoryCreateUser({ userName: 'john', roleId: 1 });

      const { body, status } = await global.api
        .get('/api/users/check-user-name')
        .set({ ...langRu, ...auth })
        .query({ userName: 'JOHN' });

      expect(status).toBe(200);
      expect(body).toEqual(expect.objectContaining({ data: true, code: 'USER.ALREADY_EXISTS' }));
    });

    it('returns {data:false} when userName free', async () => {
      const { body, status } = await global.api
        .get('/api/users/check-user-name')
        .set({ ...langRu, ...auth })
        .query({ userName: 'unique_name_123' });

      expect(status).toBe(200);
      expect(body.data).toBe(false);
      expect(body.code).toBeUndefined();
    });
  });

  // ---------- POST /check-user-data ----------
  describe('POST /api/users/check-user-data', () => {
    it('detects duplicates by name and contacts', async () => {
      // user с контактами
      const u = await factoryCreateUser({ userName: 'john', firstName: 'John', lastName: 'Smith', roleId: 1 });
      await UserContact.create({ userId: u.id, type: 'email', content: 'a@b.com' });
      await SearchUser.create({ userId: u.id, content: 'john John Smith a@b.com' });

      const { body, status } = await global.api
        .post('/api/users/check-user-data')
        .set({ ...langRu, ...auth })
        .send({
          id: null,
          firstName: 'john',
          lastName: 'SMITH',
          contacts: {
            email: ['a@b.com'],
            phoneNumber: ['+78585859944'],
            telegramId: ['#8585859944'],
            telegramPhoneNumber: ['+78585859944'],
            telegramNickname: [],
            whatsApp: [],
            vKontakte: [],
            instagram: [],
            facebook: [],
            otherContact: []
          }
        });

      expect(status).toBe(200);
      expect(body.data.duplicatesName).toEqual(['john']);
      const pair = body.data.duplicatesContact.find(x => x.type === 'email' && x.content === 'a@b.com');
      expect(pair?.users).toContain('john');
      expect(body.code).toBe('USER.HAS_DATA_DUPLICATES');
    });
  });

  // ---------- POST /create-user ----------
  describe('POST /api/users/create-user', () => {
    it('creates user, contacts, optional address, builds SearchUser and returns code USER.CREATED', async () => {
      const payload = {
        id: null,
        userName: 'kate5',
        password: '102dfgdfgd',
        firstName: 'Kate',
        patronymic: null,
        lastName: 'SMITH',
        roleId: 1,
        draftAddress: {
          countryId: 1,
          regionId: null,
          districtId: null,
          localityId: null
        },
        comment: null,
        isRestricted: false,
        causeOfRestriction: null,
        dateOfRestriction: null,
        draftContacts: {
          email: ['ara@b.com'],
          phoneNumber: ['+78585859944'],
          whatsApp: [],
          telegramNickname: [],
          telegramId: ['#8585859944'],
          telegramPhoneNumber: ['+78585859944'],
          vKontakte: [],
          instagram: [],
          facebook: [],
          otherContact: []
        }
      };

      const { body, status } = await global.api
        .post('/api/users/create-user')
        .set({ ...langRu, ...auth })
        .send(payload);

      expect(status).toBe(201);
      expect(body.code).toBe('USER.CREATED');
      expect(body.data).toBe('kate5');

      const [userRow] = await select(`SELECT id, "userName" FROM users WHERE "userName" = $1`, [payload.userName]);
      expect(userRow).toBeTruthy();

      const search = await SearchUser.findOne({ where: { userId: userRow.id, isRestricted: false } });
      expect(search?.content).toMatch(/kate5/i);
    });
  });

  // ---------- GET /get-user-by-id/:id ----------
  describe('GET /api/users/get-user-by-id/:id', () => {
    it('returns user with contacts/addresses and role name', async () => {
      const u = await factoryCreateUser({ userName: 'mike4', roleId: 1 });
      await UserContact.create({ userId: u.id, type: 'email', content: 'm@ex.com' });

      const { body, status } = await global.api
        .get(`/api/users/get-user-by-id/${u.id}`)

        .set({ ...langRu, ...auth });

      expect(status).toBe(200);
      expect(body.data.userName).toBe('mike4');
      expect(Array.isArray(body.data.orderedContacts.email)).toBe(true);
      expect(body.data.orderedContacts.email.length).toBeGreaterThanOrEqual(1);
    });

    it('404 + ERRORS.USER.NOT_FOUND when missing', async () => {
      const { body, status } = await global.api
        .get('/api/users/get-user-by-id/999999')
        .set({ ...langRu, ...auth });

      expect(status).toBe(404);
      expect(body.code).toBe('ERRORS.USER.NOT_FOUND');
    });
  });

  // ---------- PATCH /change-password ----------
  describe('PATCH /api/users/change-password', () => {
    it('self path: requires currentPassword, updates hash, revokes refresh tokens', async () => {
      const u = await createUserHashed({ userName: 'self', roleId: 1 });
      // подложим refresh-токен
      await RefreshToken.create({ userId: u.id, token: 't12345687', expiresAt: '2025-11-25 17:24:54.901-05' });

      const { body, status } = await global.api
        .patch('/api/users/change-password')
        .set({ ...langRu, ...auth })
        .send({ userId: u.id, currentPassword: 'password2025', newPassword: 'new12345' });

      expect(status).toBe(200);
      expect(body.code).toBe('USER.PASSWORD_CHANGED');

      const tokensLeft = await RefreshToken.count({ where: { userId: u.id } });
      expect(tokensLeft).toBe(0);
    });

    it('returns 422 when currentPassword missing for self', async () => {
      const u = await factoryCreateUser({ userName: 'self2', roleId: 1 });

      const { body, status } = await global.api
        .patch('/api/users/change-password')
        .set({ ...langRu, ...auth })
        .send({ userId: u.id, newPassword: 'new123456' });

      expect(status).toBe(422);
      expect(body.code).toBe('ERRORS.USER.CURRENT_PASSWORD_REQUIRED');
    });
  });

  // ---------- PATCH /block-user & /unblock-user ----------
  describe('PATCH /api/users/block-user & /unblock-user', () => {
    it('blocks and unblocks user, returns codes USER.BLOCKED / USER.UNBLOCKED', async () => {
      const u = await factoryCreateUser({ userName: 'blockme', roleId: 1 });

      const r1 = await global.api
        .patch('/api/users/block-user')
        .set({ ...langRu, ...auth })
        .send({ id: u.id, causeOfRestriction: 'spam' });

      expect(r1.status).toBe(200);
      expect(r1.body.code).toBe('USER.BLOCKED');

      const r2 = await global.api
        .patch('/api/users/unblock-user')
        .set({ ...langRu, ...auth })
        .send({ id: u.id });

      expect(r2.status).toBe(200);
      expect(r2.body.code).toBe('USER.UNBLOCKED');
    });
  });
  // ---------- DELETE /delete-user/:id ----------
  describe('DELETE /api/users/delete-user/:id', () => {
    it('deletes user, cascades cleanup, returns code USER.DELETED', async () => {
      const u = await factoryCreateUser({ userName: 'todel', roleId: 1 });
      await RefreshToken.create({ userId: u.id, token: 'zz125846254', expiresAt: '2025-11-25 17:24:54.901-05' });

      const { body, status } = await global.api
        .delete(`/api/users/delete-user/${u.id}`)
        .set({ ...langRu, ...auth });

      expect(status).toBe(200);
      expect(body.code).toBe('USER.DELETED');
      expect(body.data).toBeNull();

      const users = await select(`SELECT id FROM users WHERE id = $1`, [u.id]);
      expect(users.length).toBe(0);
    });
    it('404 + ERRORS.USER.NOT_FOUND when deleting missing user', async () => {
      const { body, status } = await global.api
        .delete(`/api/users/delete-user/999999`)
        .set({ ...langRu, ...auth });

      expect(status).toBe(404);
      expect(body.code).toBe('ERRORS.USER.NOT_FOUND');
    });
  })

  // ---------- POST /get-users (минимальный happy-path) ----------
  describe('POST /api/users/get-users', () => {
    it('returns list with length and transformed items', async () => {
      const u1 = await factoryCreateUser({ userName: 'anna', firstName: 'Anna', lastName: 'Bell', roleId: 1 });
      const u2 = await factoryCreateUser({ userName: 'boris', firstName: 'Boris', lastName: 'Cook', roleId: 1 });
      await SearchUser.create({ userId: u1.id, content: 'anna Anna Bell' });
      await SearchUser.create({ userId: u2.id, content: 'boris Boris Cook' });
      const { body, status } = await global.api
        .post('/api/users/get-users')
        .set({ ...langRu, ...auth })
        .send({
          page: { size: 10, number: 0 },
          sort: [{ field: 'userName', direction: 'asc' }],
          search: { value: 'anna' },
          view: { option: 'only-active', includeOutdated: false },
          filters: { mode: { strictAddress: false, strictContact: false } }
        });

      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.data.users)).toBe(true);
      const names = body.data.users.map(u => u.userName);
      expect(names).toContain('anna');
    });
  });
});
