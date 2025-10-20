// tests/int/toponyms.api.int.test.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import sequelize from '../../database.js';
import { Op } from 'sequelize';
import { beforeEach, jest } from '@jest/globals';
import { createRole, findRoleById, seedOperationsForRole } from './factories/role.js';
import { createCountry, createRegion, createDistrict, createLocality } from './factories/toponym.js';
import { select } from './helpers/sql.js';
import { Country, Region, District, Locality, UserAddress, Role, RolePermission } from '../../models/index.js';

// NOTE: We assume your jest setup exposes `global.api` (supertest(app)).
// If not, mirror your roles tests setup or replace `global.api` with your local `request(app)` instance.

describe('Toponyms API (integration)', () => {
  const langRu = { 'x-lang': 'ru' };
  let auth = {};

  beforeAll(async () => {
    // Create a short-lived JWT matching your check-auth expectations
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not set (check .env.test)');
    }
    const token = jwt.sign(
      { sub: '1', uname: 'superAdmin', role: 'ADMIN', roleId: 1 },
      secret,
      { issuer: 'cards-sql-app', audience: 'web', expiresIn: '15m' }
    );
    auth = { Authorization: `Bearer ${token}` };
  });

  beforeEach(async () => {

    await Role.destroy({ where: { id: 1, }, truncate: true, cascade: true, restartIdentity: true });

    const role = await createRole({ name: 'ADMIN', description: 'test-admin' });
    //console.log('role', role);
    await RolePermission.destroy({ where: { roleId: 1, } });
    await seedOperationsForRole(1);
    const perms = ['VIEW_FULL_TOPONYMS_LIST', 'VIEW_LIMITED_TOPONYMS_LIST', 'ADD_NEW_TOPONYM',
      'EDIT_TOPONYM', 'DELETE_TOPONYM', 'VIEW_TOPONYM', 'BLOCK_TOPONYM',
    ];

    await RolePermission.update(
      { access: true },
      { where: { roleId: 1, name: { [Op.in]: perms } } }
    );
    //await RolePermission.bulkUpdate();
    const rows = await RolePermission.findAll({
      where: { roleId: 1, access: true },
      raw: true,
    });
    //console.log('RolePermission.findAll', rows);
    if (rows.length === 0) {
      throw new Error('Seeded permission not found via RolePermission.findAll()');
    }

    // Clean tables in dependency order to avoid FK issues
    // If you use ON DELETE CASCADE everywhere, you can truncate with CASCADE.
    await Locality.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    await District.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    await Region.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    await Country.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });

    // UserAddress might reference country/region/district/locality IDs.
    if (UserAddress?.destroy) {
      await UserAddress.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    }
  });

  // ---------- GET /api/toponyms/check-toponym-name ----------
  describe('GET /api/toponyms/check-toponym-name', () => {
    it('returns {data:true, code:TOPONYM.ALREADY_EXISTS} when duplicate exists in same parent scope', async () => {
      const c = await createCountry({ name: 'Россия' });
      await createRegion({ name: 'Москва', shortName: 'Мск', countryId: c.id });

      const { body, status } = await global.api
        .get('/api/toponyms/check-toponym-name')
        .set({ ...langRu, ...auth })
        .query({ type: 'region', name: 'Москва', countryId: c.id });

      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          data: true,
          code: 'TOPONYM.ALREADY_EXISTS',
        })
      );
    });

    it('returns {data:false} when no duplicates', async () => {
      await createCountry({ name: 'Эстония' });

      const { body, status } = await global.api
        .get('/api/toponyms/check-toponym-name')
        .set({ ...langRu, ...auth })
        .query({ type: 'country', name: 'Латвия' });

      expect(status).toBe(200);
      expect(body.data).toBe(false);
      expect(body.code).toBeUndefined();
    });
  });

  // ---------- POST /api/toponyms/create-toponym ----------
  describe('POST /api/toponyms/create-toponym', () => {
    it('creates region and returns code TOPONYM.CREATED with hydrated object', async () => {
      const c = await createCountry({ name: 'Россия' });
      const payload = { type: 'region', name: 'Тверская', shortName: 'Твер.', countryId: c.id };

      const { body, status } = await global.api
        .post('/api/toponyms/create-toponym')
        .set({ ...langRu, ...auth })
        .send(payload);

      expect(status).toBe(201);
      expect(body.code).toBe('TOPONYM.CREATED');
      expect(body.data).toEqual(expect.objectContaining({
        id: expect.any(Number),
        name: 'Тверская',
        shortName: 'Твер.',
      }));

      // Verify row exists in DB
      const rows = await select(
        `SELECT id, name, "shortName", "countryId"
           FROM regions WHERE lower(name) = lower($1)`,
        [payload.name]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].countryId).toBe(c.id);
    });

    it('422 + ERRORS.VALIDATION when required field missing', async () => {
      const c = await createCountry({ name: 'Россия' });
      const { body, status } = await global.api
        .post('/api/toponyms/create-toponym')
        .set({ ...langRu, ...auth })
        .send({ type: 'region', name: 'X', countryId: c.id }); // missing shortName

      expect(status).toBe(422);
      expect(body.code).toBe('ERRORS.VALIDATION');
    });
  });

  // ---------- POST /api/toponyms/update-toponym ----------
  describe('POST /api/toponyms/update-toponym', () => {
    it('updates and returns code TOPONYM.UPDATED with hydrated object', async () => {
      const c = await createCountry({ name: 'Россия' });
      const r = await createRegion({ name: 'Ярославская', shortName: 'Яросл.', countryId: c.id });

      const { body, status } = await global.api
        .post('/api/toponyms/update-toponym')
        .set({ ...langRu, ...auth })
        .send({ type: 'region', id: r.id, name: 'Обновлена', shortName: 'Обн.', countryId: c.id });

      expect(status).toBe(201);
      expect(body.code).toBe('TOPONYM.UPDATED');
      expect(body.data).toEqual(expect.objectContaining({ id: r.id, name: 'Обновлена', shortName: 'Обн.' }));
    });

    it('404 + ERRORS.TOPONYM.NOT_FOUND when row does not exist', async () => {
      const c = await createCountry({ name: 'Россия' });

      const { body, status } = await global.api
        .post('/api/toponyms/update-toponym')
        .set({ ...langRu, ...auth })
        .send({ type: 'region', id: 999999, name: 'X', shortName: 'Y', countryId: c.id });

      expect(status).toBe(404);
      expect(body.code).toBe('ERRORS.TOPONYM.NOT_FOUND');
    });
  });

  // ---------- GET /api/toponyms/get-:type-by-id/:id ----------
  describe('GET /api/toponyms/get-:type-by-id/:id', () => {
    it('returns hydrated region (201)', async () => {
      const c = await createCountry({ name: 'Россия' });
      const r = await createRegion({ name: 'Карелия', shortName: 'Кар.', countryId: c.id });

      const { body, status } = await global.api
        .get(`/api/toponyms/get-region-by-id/${r.id}`)
        .set({ ...langRu, ...auth });

      expect(status).toBe(201);
      expect(body.data).toEqual(expect.objectContaining({ id: r.id, name: 'Карелия' }));
      // Includes defaultAddressParams.countryId (computed in controller)
      expect(body.data.defaultAddressParams?.countryId).toBe(c.id);
    });
  });

  // ---------- GET /api/toponyms/get-toponyms-list ----------
  describe('GET /api/toponyms/get-toponyms-list', () => {
    it('returns children (regions) filtered by countryId (non-restricted only)', async () => {
      const ru = await createCountry({ name: 'Россия' });
      const ee = await createCountry({ name: 'Эстония' });
      const r1 = await createRegion({ name: 'Москва', shortName: 'Мск', countryId: ru.id });
      await createRegion({ name: 'Тарту', shortName: 'Тарту', countryId: ee.id });

      const { body, status } = await global.api
        .get('/api/toponyms/get-toponyms-list')
        .set({ ...langRu, ...auth })
        .query({ typeOfToponym: 'regions', ids: [ru.id] });

      expect(status).toBe(200);
      const ids = body.data.map(x => x.id);
      expect(ids).toEqual([r1.id]);
    });

    it('countries: ensures Россия is moved to the top', async () => {
      const ru = await createCountry({ name: 'Россия' });
      await createCountry({ name: 'Эстония'});
      await createCountry({ name: 'Грузия' });

      const { body, status } = await global.api
        .get('/api/toponyms/get-toponyms-list')
        .set({ ...langRu, ...auth })
        .query({ typeOfToponym: 'countries', ids: [] });

      expect(status).toBe(200);
      expect(body.data[0].id).toBe(ru.id);
    });
  });

  // ---------- GET /api/toponyms/toponyms (table list with filter/sort/pagination) ----------
  describe('GET /api/toponyms/toponyms', () => {
    it('returns {toponyms,length} with OR search and pagination', async () => {
      const ru = await createCountry({ name: 'Россия' });
      await createRegion({ name: 'Москва', shortName: 'Мск', countryId: ru.id });
      await createRegion({ name: 'Московская', shortName: 'Мос.обл.', countryId: ru.id });

      const { body, status } = await global.api
        .get('/api/toponyms/toponyms')
        .set({ ...langRu, ...auth })
        .query({
          type: 'region',
          page: 0,
          pageSize: 10,
          sortBy: 'name',
          sortDir: 'asc',
          search: 'моск оск', // OR search
          exact: 'false',
          countries: [],
          regions: [],
          districts: [],
          localities: [],
        });

      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(body.data.toponyms)).toBe(true);
      expect(body.data.toponyms.length).toBeGreaterThan(0);
    });
  });

  // ---------- GET /api/toponyms/check-toponym-before-delete ----------
  describe('GET /api/toponyms/check-toponym-before-delete', () => {
    it('returns {data:0} for empty toponym (no code) when destroy=true', async () => {
      const c = await createCountry({ name: 'Эстония' });

      const { body, status } = await global.api
        .get('/api/toponyms/check-toponym-before-delete')
        .set({ ...langRu, ...auth })
        .query({ type: 'country', id: c.id, destroy: 'true' });

      expect(status).toBe(200);
      expect(body.data).toBe(0);
      expect(body.code).toBeUndefined();
    });

    // If you have reliable schema for UserAddress, add a positive-case test here by inserting rows.
    // We skip it to avoid guessing required columns.
  });

  // ---------- DELETE /api/toponyms/delete-toponym ----------
  describe('DELETE /api/toponyms/delete-toponym', () => {
    it('hard delete (destroy=true): returns code TOPONYM.DELETED', async () => {
      const c = await createCountry({ name: 'Удаляемая' });

      const { body, status } = await global.api
        .delete('/api/toponyms/delete-toponym')
        .set({ ...langRu, ...auth })
        .query({ type: 'country', id: c.id, destroy: 'true' });

      expect(status).toBe(200);
      expect(body.code).toBe('TOPONYM.DELETED');

      const check = await select('SELECT id FROM countries WHERE id = $1', [c.id]);
      expect(check.length).toBe(0);
    });

    it('soft delete (destroy=false): sets isRestricted=true', async () => {
      const r = await createRegion(); // will create RU + region

      const { body, status } = await global.api
        .delete('/api/toponyms/delete-toponym')
        .set({ ...langRu, ...auth })
        .query({ type: 'region', id: r.id, destroy: 'false' });

      expect(status).toBe(200);
      expect(body.code).toBe('TOPONYM.DELETED');

      const rows = await select('SELECT "isRestricted" FROM regions WHERE id = $1', [r.id]);
      expect(rows[0].isRestricted).toBe(true);
    });

    it('404 + ERRORS.TOPONYM.NOT_FOUND when deleting missing row', async () => {
      const { body, status } = await global.api
        .delete('/api/toponyms/delete-toponym')
        .set({ ...langRu, ...auth })
        .query({ type: 'country', id: 999999, destroy: 'true' });

      expect(status).toBe(404);
      expect(body.code).toBe('ERRORS.TOPONYM.NOT_FOUND');
    });
  });

  // ---------- POST /api/toponyms/populate-toponyms ----------
  describe('POST /api/toponyms/populate-toponyms', () => {
    it('422 + ERRORS.TOPONYM.BULK_INPUT_DUPLICATES for duplicates within input', async () => {
      const { body, status } = await global.api
        .post('/api/toponyms/populate-toponyms')
        .set({ ...langRu, ...auth })
        .send({
          type: 'country',
          data: [
            { __i: 1, name: 'Estonia', shortName: 'EE' },
            { __i: 2, name: 'estonia', shortName: 'EE' },
          ],
        });

      expect(status).toBe(422);
      expect(body.code).toBe('ERRORS.TOPONYM.BULK_INPUT_DUPLICATES');
    });

    it('409 + ERRORS.TOPONYM.FROM_BULK_ALREADY_EXISTS when DB has conflicts', async () => {
      await createCountry({ name: 'Estonia', shortName: 'EE' });

      const { body, status } = await global.api
        .post('/api/toponyms/populate-toponyms')
        .set({ ...langRu, ...auth })
        .send({ type: 'country', data: [{ __i: 1, name: 'Estonia', shortName: 'EE' }] });

      expect(status).toBe(409);
      expect(body.code).toBe('ERRORS.TOPONYM.FROM_BULK_ALREADY_EXISTS');
    });

    it('201 + TOPONYM.BULK_CREATED when ok (country)', async () => {
      const { body, status } = await global.api
        .post('/api/toponyms/populate-toponyms')
        .set({ ...langRu, ...auth })
        .send({
          type: 'country',
          data: [
            { __i: 1, name: 'Estonia', shortName: 'EE' },
            { __i: 2, name: 'Latvia', shortName: 'LV' },
          ],
        });

      expect(status).toBe(201);
      expect(body).toEqual({ code: 'TOPONYM.BULK_CREATED', data: 2 });

      const rows = await select(`SELECT name FROM countries WHERE lower(name) IN (lower($1), lower($2))`, ['Estonia', 'Latvia']);
      expect(rows.length).toBe(2);
    });
  });
});
