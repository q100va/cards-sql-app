import jwt from 'jsonwebtoken';

import { Country } from '../../models/index.js';

import { createRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';
import { createCountry, createRegion } from './factories/toponym.js';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'toponyms-integration-user', role: 'TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedRole(operationNames = []) {
  const role = await createRole();

  for (const name of operationNames) {
    await createOperation({ roleId: role.id, name, access: true, disabled: false });
  }

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

describe('toponyms API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .get('/api/toponyms/check-toponym-name')
      .query({ type: 'country', name: 'Россия' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the authenticated role lacks permission', async () => {
    const role = await createRole();
    const token = makeAccessToken(role.id);

    const res = await auth(global.api.get('/api/toponyms/check-toponym-name'), token).query({
      type: 'country',
      name: 'Россия',
    });

    expect(res.status).toBe(403);
  });

  test('checks whether a toponym name already exists', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_TOPONYM']);

    await createCountry({ name: 'Россия', shortName: 'RU' });

    const existing = await auth(global.api.get('/api/toponyms/check-toponym-name'), token).query({
      type: 'country',
      name: 'Россия',
    });

    expect(existing.status).toBe(200);
    expect(existing.body).toEqual({ code: 'ERRORS.TOPONYM.ALREADY_EXISTS', data: true });

    const missing = await auth(global.api.get('/api/toponyms/check-toponym-name'), token).query({
      type: 'country',
      name: 'Несуществующая страна',
    });

    expect(missing.status).toBe(200);
    expect(missing.body).toEqual({ data: false });
  });

  test('creates a country and rejects a duplicate', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_TOPONYM']);

    const payload = { type: 'country', name: 'Тестландия' };

    const created = await auth(global.api.post('/api/toponyms/create-toponym'), token).send(
      payload,
    );

    expect(created.status).toBe(201);
    expect(created.body.code).toBe('SUCCESS.CREATED');
    expect(created.body.data).toMatchObject({ name: 'Тестландия' });

    const row = await Country.findOne({ where: { name: 'Тестландия' }, raw: true });

    expect(row).not.toBeNull();

    const duplicate = await auth(global.api.post('/api/toponyms/create-toponym'), token).send(
      payload,
    );

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ code: 'ERRORS.TOPONYM.ALREADY_EXISTS' });
  });

  test('updates an existing country', async () => {
    const { token } = await createAuthorizedRole(['EDIT_TOPONYM']);

    const country = await createCountry({ name: 'Старое название', shortName: 'OLD' });

    const res = await auth(global.api.post('/api/toponyms/update-toponym'), token).send({
      id: country.id,
      type: 'country',
      name: 'Новое название',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 'SUCCESS.UPDATED',
      data: { id: country.id, name: 'Новое название' },
    });

    const updated = await Country.findByPk(country.id, { raw: true });

    expect(updated.name).toBe('Новое название');
  });

  test('returns a toponym by id', async () => {
    const { token } = await createAuthorizedRole(['VIEW_TOPONYM']);

    const country = await createCountry({ name: 'Канада', shortName: 'CA' });

    const res = await auth(global.api.get(`/api/toponyms/get-country-by-id/${country.id}`), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: country.id,
      name: 'Канада',
      defaultAddressParams: {
        countryId: country.id,
        regionId: null,
        districtId: null,
        localityId: null,
      },
    });
  });

  test('returns only active countries in the short list and places Russia first', async () => {
    const { token } = await createAuthorizedRole(['VIEW_TOPONYM']);

    await createCountry({ name: 'Беларусь', shortName: 'BY' });

    await createCountry({ name: 'Россия', shortName: 'RU' });

    await createCountry({ name: 'Скрытая страна', shortName: 'HD', isRestricted: true });

    const res = await auth(global.api.get('/api/toponyms/get-toponyms-list'), token).query({
      typeOfToponym: 'countries',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.map((item) => item.name)).toEqual(['Россия', 'Беларусь']);
  });

  test('returns paginated active toponyms', async () => {
    const { token } = await createAuthorizedRole(['VIEW_LIMITED_TOPONYMS_LIST']);

    await createCountry({ name: 'Alpha', shortName: 'AA' });

    await createCountry({ name: 'Beta', shortName: 'BB' });

    await createCountry({ name: 'Hidden', shortName: 'HH', isRestricted: true });

    const res = await auth(global.api.get('/api/toponyms/toponyms'), token).query({
      type: 'country',
      page: 0,
      pageSize: 1,
      sortBy: 'name',
      sortDir: 'asc',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.toponyms).toHaveLength(1);
    expect(res.body.data.toponyms[0]).toMatchObject({ name: 'Alpha' });
  });

  test('detects dependencies and prevents permanent deletion', async () => {
    const { token } = await createAuthorizedRole(['DELETE_TOPONYM']);

    const country = await createCountry({ name: 'Parent Country', shortName: 'PC' });

    await createRegion({ countryId: country.id, name: 'Child Region', shortName: 'CR' });

    const check = await auth(
      global.api.get('/api/toponyms/check-toponym-before-delete'),
      token,
    ).query({ id: country.id, type: 'country', destroy: true });

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ code: 'ERRORS.TOPONYM.HAS_DEPENDENCIES', data: 1 });

    const deletion = await auth(global.api.delete('/api/toponyms/delete-toponym'), token).query({
      id: country.id,
      type: 'country',
      destroy: true,
    });

    expect(deletion.status).toBe(409);
    expect(deletion.body).toMatchObject({ code: 'ERRORS.TOPONYM.HAS_DEPENDENCIES' });

    const row = await Country.findByPk(country.id, { raw: true });

    expect(row).not.toBeNull();
  });

  test('blocks an unused toponym instead of deleting it', async () => {
    const { token } = await createAuthorizedRole(['BLOCK_TOPONYM']);

    const country = await createCountry({ name: 'Blocked Country', shortName: 'BC' });

    const res = await auth(global.api.delete('/api/toponyms/delete-toponym'), token).query({
      id: country.id,
      type: 'country',
      destroy: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.DELETED', data: null });

    const row = await Country.findByPk(country.id, { raw: true });

    expect(row).not.toBeNull();
    expect(row.isRestricted).toBe(true);
  });

  test('permanently deletes an unused toponym', async () => {
    const { token } = await createAuthorizedRole(['DELETE_TOPONYM']);

    const country = await createCountry({ name: 'Disposable Country', shortName: 'DC' });

    const res = await auth(global.api.delete('/api/toponyms/delete-toponym'), token).query({
      id: country.id,
      type: 'country',
      destroy: true,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.DELETED', data: null });

    const row = await Country.findByPk(country.id, { raw: true });

    expect(row).toBeNull();
  });

  test('bulk creates countries and rejects duplicates inside the input', async () => {
    const { token } = await createAuthorizedRole(['UPLOAD_LIST_OF_TOPONYMS']);

    const created = await auth(global.api.post('/api/toponyms/populate-toponyms'), token).send({
      type: 'country',
      data: [{ name: 'Канада' }, { name: 'Мексика' }],
    });

    expect(created.status).toBe(201);
    expect(created.body).toEqual({ code: 'SUCCESS.CREATED', data: 2 });

    const duplicateInput = await auth(
      global.api.post('/api/toponyms/populate-toponyms'),
      token,
    ).send({ type: 'country', data: [{ name: 'Аргентина' }, { name: 'Аргентина' }] });

    expect(duplicateInput.status).toBe(422);
    expect(duplicateInput.body).toMatchObject({ code: 'ERRORS.TOPONYM.BULK_INPUT_DUPLICATES' });
  });
});
