import jwt from 'jsonwebtoken';

import { Occasion } from '../../models/index.js';

import { createRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'occasions-integration-user', role: 'OCCASIONS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedRole(operationNames = []) {
  const role = await createRole({ name: 'Occasions Test Role' });

  for (const name of new Set(operationNames)) {
    await createOperation({ roleId: role.id, name, access: true, disabled: false });
  }

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

function occasionDraft(overrides = {}) {
  return {
    type: overrides.type ?? 1,
    month: overrides.month === undefined ? 11 : overrides.month,
    year: overrides.year ?? 2027,
    status: overrides.status ?? 1,
  };
}

async function createOccasionThroughApi(token, overrides = {}) {
  const draft = occasionDraft(overrides);

  const res = await auth(global.api.post('/api/occasions/create-occasion'), token).send(draft);

  expect(res.status).toBe(200);
  expect(res.body.code).toBe('SUCCESS.CREATED');

  const occasion = await Occasion.findOne({
    where: { type: draft.type, month: draft.month, year: draft.year },
  });

  expect(occasion).not.toBeNull();

  return occasion;
}

describe('occasions API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .get('/api/occasions/check-occasion-data')
      .query({ type: 1, month: 11, year: 2027 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks permission', async () => {
    const role = await createRole({ name: 'No Occasions Access Role' });

    const token = makeAccessToken(role.id);

    const res = await auth(global.api.post('/api/occasions/create-occasion'), token).send(
      occasionDraft(),
    );

    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid occasion data', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION']);

    const res = await auth(global.api.get('/api/occasions/check-occasion-data'), token).query({
      type: 7,
      month: 11,
      year: 2027,
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('detects an existing birthday occasion by type, year, and month', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION']);

    await createOccasionThroughApi(token, { type: 1, month: 4, year: 2027 });

    const duplicate = await auth(global.api.get('/api/occasions/check-occasion-data'), token).query(
      { type: 1, month: 4, year: 2027 },
    );

    expect(duplicate.status).toBe(200);
    expect(duplicate.body).toEqual({ code: 'ERRORS.OCCASION.ALREADY_EXISTS', data: true });

    const differentMonth = await auth(
      global.api.get('/api/occasions/check-occasion-data'),
      token,
    ).query({ type: 1, month: 5, year: 2027 });

    expect(differentMonth.status).toBe(200);
    expect(differentMonth.body).toEqual({ data: false });
  });

  test('creates a birthday occasion', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION']);

    const res = await auth(global.api.post('/api/occasions/create-occasion'), token).send({
      type: 1,
      month: 6,
      year: 2028,
      status: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'SUCCESS.CREATED', data: expect.any(String) });

    const occasion = await Occasion.findOne({
      where: { type: 1, month: 6, year: 2028 },
      raw: true,
    });

    expect(occasion).not.toBeNull();
    expect(occasion.status).toBe(1);
  });

  test('creates an annual occasion with null month', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION']);

    const res = await auth(global.api.post('/api/occasions/create-occasion'), token).send({
      type: 2,
      month: null,
      year: 2028,
      status: 1,
    });

    expect(res.status).toBe(200);

    const occasion = await Occasion.findOne({ where: { type: 2, year: 2028 }, raw: true });

    expect(occasion).not.toBeNull();
    expect(occasion.month).toBeNull();
  });

  test('rejects a birthday occasion without a month', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION']);

    const res = await auth(global.api.post('/api/occasions/create-occasion'), token).send({
      type: 1,
      month: null,
      year: 2028,
      status: 1,
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('rejects a month for a non-birthday occasion', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION']);

    const res = await auth(global.api.post('/api/occasions/create-occasion'), token).send({
      type: 2,
      month: 6,
      year: 2028,
      status: 1,
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('returns occasions newest first and builds unique filter options', async () => {
    const { token } = await createAuthorizedRole([
      'ADD_NEW_OCCASION',
      'VIEW_LIMITED_OCCASIONS_LIST',
    ]);

    const first = await createOccasionThroughApi(token, {
      type: 1,
      month: 10,
      year: 2027,
      status: 1,
    });

    const second = await createOccasionThroughApi(token, {
      type: 1,
      month: 11,
      year: 2027,
      status: 2,
    });

    const third = await createOccasionThroughApi(token, {
      type: 2,
      month: null,
      year: 2028,
      status: 1,
    });

    const res = await auth(global.api.get('/api/occasions/get-occasions'), token);

    expect(res.status).toBe(200);
    expect(res.body.data.occasions.map((occasion) => occasion.id)).toEqual([
      third.id,
      second.id,
      first.id,
    ]);
    expect(res.body.data.options.year).toEqual([2027, 2028]);

    for (const values of Object.values(res.body.data.options)) {
      expect(new Set(values).size).toBe(values.length);
    }
  });

  test('returns an occasion by id', async () => {
    const { token } = await createAuthorizedRole([
      'ADD_NEW_OCCASION',
      'VIEW_LIMITED_RECIPIENTS_LIST',
    ]);

    const occasion = await createOccasionThroughApi(token, {
      type: 1,
      month: 9,
      year: 2028,
      status: 1,
    });

    const res = await auth(
      global.api.get(`/api/occasions/get-occasion-by-id/${occasion.id}`),
      token,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: occasion.id, year: 2028, amount: 0 });
    expect(typeof res.body.data.type).toBe('string');
    expect(typeof res.body.data.status).toBe('string');
  });

  test('edits occasion status', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION', 'BLOCK_OCCASION']);

    const occasion = await createOccasionThroughApi(token, {
      type: 1,
      month: 8,
      year: 2028,
      status: 1,
    });

    const res = await auth(global.api.patch('/api/occasions/edit-occasion'), token).send({
      id: occasion.id,
      status: 2,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.UPDATED', data: null });

    const updated = await Occasion.findByPk(occasion.id, { raw: true });

    expect(updated.status).toBe(2);
  });

  test('returns only active occasions of the requested type in descending date order', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION', 'ADD_NEW_ORDER']);

    const older = await createOccasionThroughApi(token, {
      type: 1,
      month: 5,
      year: 2027,
      status: 1,
    });

    const newer = await createOccasionThroughApi(token, {
      type: 1,
      month: 7,
      year: 2028,
      status: 1,
    });

    await createOccasionThroughApi(token, { type: 1, month: 9, year: 2029, status: 2 });

    await createOccasionThroughApi(token, { type: 2, month: null, year: 2028, status: 1 });

    const res = await auth(global.api.get('/api/occasions/get-actual-occasions/1'), token);

    expect(res.status).toBe(200);
    expect(res.body.data.map((occasion) => occasion.id)).toEqual([newer.id, older.id]);
  });

  test('deletes an occasion without recipients', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_OCCASION', 'DELETE_OCCASION']);

    const occasion = await createOccasionThroughApi(token, { type: 1, month: 3, year: 2029 });

    const res = await auth(
      global.api.delete(`/api/occasions/delete-occasion/${occasion.id}`),
      token,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.DELETED', data: null });
    expect(await Occasion.findByPk(occasion.id)).toBeNull();
  });
});
