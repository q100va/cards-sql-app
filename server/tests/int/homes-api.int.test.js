import jwt from 'jsonwebtoken';

import { Home, HomeAddress, HomeSearch, Senior } from '../../models/index.js';

import { createRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';
import {
  createCountry,
  createRegion,
  createDistrict,
  createLocality,
} from './factories/toponym.js';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'homes-integration-user', role: 'HOMES_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedRole(operationNames = []) {
  const role = await createRole({ name: 'Homes Test Role' });

  for (const name of new Set(operationNames)) {
    await createOperation({ roleId: role.id, name, access: true, disabled: false });
  }

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

async function createLocation(overrides = {}) {
  const country = await createCountry({
    name: overrides.countryName ?? 'Test Country',
    shortName: overrides.countryShortName ?? 'TC',
  });

  const region = await createRegion({
    countryId: country.id,
    name: overrides.regionName ?? 'Test Region',
    shortName: overrides.regionShortName ?? 'TR',
  });

  const district = await createDistrict({
    regionId: region.id,
    name: overrides.districtName ?? 'Test District',
    shortName: overrides.districtShortName ?? 'TD',
    postName: overrides.districtPostName ?? 'Test District',
    shortPostName: overrides.districtShortPostName ?? 'TD',
  });

  const locality = await createLocality({
    districtId: district.id,
    name: overrides.localityName ?? 'Test Locality',
    shortName: overrides.localityShortName ?? 'TL',
  });

  return { country, region, district, locality };
}

function emptyContacts() {
  return {
    email: [],
    phoneNumber: [],
    whatsApp: [],
    telegramNickname: [],
    telegramId: [],
    telegramPhoneNumber: [],
    vKontakte: [],
    instagram: [],
    facebook: [],
    website: [],
    otherContact: [],
  };
}

function homeDraft(location, overrides = {}) {
  const isRestricted = overrides.isRestricted ?? false;

  const isClose = overrides.isClose ?? false;

  return {
    id: null,
    homeName: overrides.homeName ?? 'Integration Home',
    officialName: overrides.officialName ?? 'Integration Home Official Name',
    postalName: overrides.postalName ?? 'Integration Home',
    noAddress: overrides.noAddress ?? false,
    specialHome: overrides.specialHome ?? false,
    acceptableForSchool: overrides.acceptableForSchool ?? false,
    postalCode: overrides.postalCode ?? '123456',
    draftAddress: {
      countryId: location.country.id,
      regionId: location.region.id,
      districtId: location.district.id,
      localityId: location.locality.id,
    },
    postalAddressPart: overrides.postalAddressPart ?? '10 Integration Street',
    comment: overrides.comment ?? null,
    infoNote: overrides.infoNote ?? null,
    isRestricted,
    causeOfRestriction:
      overrides.causeOfRestriction ?? (isRestricted ? 'Integration restriction' : null),
    dateOfRestriction:
      overrides.dateOfRestriction ?? (isRestricted ? '2026-01-10T12:00:00.000Z' : null),
    draftContacts: overrides.draftContacts ?? emptyContacts(),
    draftCoordinations: overrides.draftCoordinations ?? [],
    isClose,
    dateOfClose: overrides.dateOfClose ?? (isClose ? '2026-01-11T12:00:00.000Z' : null),
  };
}

async function createHomeThroughApi(token, location, overrides = {}) {
  const draft = homeDraft(location, overrides);

  const res = await auth(global.api.post('/api/homes/create-home'), token).send(draft);

  expect(res.status).toBe(201);

  const home = await Home.findOne({ where: { homeName: draft.homeName } });

  expect(home).not.toBeNull();

  return home;
}

function simpleUpdate(id, main) {
  return {
    id,
    changingData: { main, address: null, contacts: null, coordinations: null },
    restoringData: { addresses: null, officialNames: null, contacts: null, coordinations: null },
    outdatingData: { address: null, officialName: null, contacts: null, coordinations: null },
    deletingData: { officialNames: null, addresses: null, contacts: null, coordinations: null },
  };
}

describe('homes API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api.get('/api/homes/check-home-name').query({ homeName: 'Test Home' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks permission', async () => {
    const role = await createRole({ name: 'No Homes Access Role' });

    const token = makeAccessToken(role.id);

    const location = await createLocation();

    const res = await auth(global.api.post('/api/homes/create-home'), token).send(
      homeDraft(location),
    );

    expect(res.status).toBe(403);
  });

  test('checks home names case-insensitively and excludes the current home', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME']);

    const location = await createLocation();

    const home = await createHomeThroughApi(token, location, { homeName: 'Case Home' });

    const duplicate = await auth(global.api.get('/api/homes/check-home-name'), token).query({
      homeName: 'case home',
    });

    expect(duplicate.status).toBe(200);
    expect(duplicate.body).toEqual({ code: 'ERRORS.HOME.ALREADY_EXISTS', data: true });

    const self = await auth(global.api.get('/api/homes/check-home-name'), token).query({
      homeName: 'CASE HOME',
      id: home.id,
    });

    expect(self.status).toBe(200);
    expect(self.body).toEqual({ data: false });
  });

  test('creates a home with address and search row', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME']);

    const location = await createLocation();

    const draft = homeDraft(location, { homeName: 'Created Home', comment: 'Integration home' });

    const res = await auth(global.api.post('/api/homes/create-home'), token).send(draft);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ code: 'SUCCESS.CREATED', data: 'Created Home' });

    const home = await Home.findOne({ where: { homeName: 'Created Home' }, raw: true });

    expect(home).not.toBeNull();

    const address = await HomeAddress.findOne({
      where: { homeId: home.id, isRestricted: false },
      raw: true,
    });

    expect(address).not.toBeNull();
    expect(address.countryId).toBe(location.country.id);
    expect(address.regionId).toBe(location.region.id);
    expect(address.districtId).toBe(location.district.id);
    expect(address.localityId).toBe(location.locality.id);

    const search = await HomeSearch.findOne({
      where: { homeId: home.id, isRestricted: false },
      raw: true,
    });

    expect(search).not.toBeNull();
    expect(typeof search.content).toBe('string');
    expect(search.content.length).toBeGreaterThan(0);
  });

  test('updates main home data', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'EDIT_HOME']);

    const location = await createLocation();

    const home = await createHomeThroughApi(token, location, { homeName: 'Update Home' });

    const res = await auth(global.api.post('/api/homes/update-home'), token).send(
      simpleUpdate(home.id, {
        homeName: 'Updated Home',
        comment: 'Updated by integration test',
        specialHome: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SUCCESS.UPDATED');
    expect(res.body.data).toMatchObject({
      id: home.id,
      homeName: 'Updated Home',
      comment: 'Updated by integration test',
      specialHome: true,
    });

    const updated = await Home.findByPk(home.id, { raw: true });

    expect(updated.homeName).toBe('Updated Home');
    expect(updated.comment).toBe('Updated by integration test');
    expect(updated.specialHome).toBe(true);
  });

  test('returns a home by id', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'VIEW_HOME']);

    const location = await createLocation();

    const home = await createHomeThroughApi(token, location, {
      homeName: 'View Home',
      officialName: 'View Home Official',
    });

    const res = await auth(global.api.get(`/api/homes/get-home-by-id/${home.id}`), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: home.id,
      homeName: 'View Home',
      officialName: 'View Home Official',
      isRestricted: false,
      isClose: false,
    });
    expect(res.body.data.address).toMatchObject({
      country: { id: location.country.id },
      region: { id: location.region.id },
    });
  });

  test('returns only active homes and preserves total count during pagination', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'VIEW_LIMITED_HOMES_LIST']);

    const location = await createLocation();

    await createHomeThroughApi(token, location, { homeName: 'Active Alpha' });

    await createHomeThroughApi(token, location, { homeName: 'Active Beta' });

    await createHomeThroughApi(token, location, { homeName: 'Blocked Gamma', isRestricted: true });

    const res = await auth(global.api.post('/api/homes/get-homes'), token).send({
      page: { size: 1, number: 0 },
      view: { option: 'only-active', includeOutdated: false },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].isRestricted).toBe(false);
    expect(res.body.data.list[0].isClose).toBe(false);
  });

  test('searches homes using the generated search row', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'VIEW_LIMITED_HOMES_LIST']);

    const location = await createLocation();

    await createHomeThroughApi(token, location, { homeName: 'Searchable Residence' });

    await createHomeThroughApi(token, location, { homeName: 'Other Residence' });

    const res = await auth(global.api.post('/api/homes/get-homes'), token).send({
      page: { size: 10, number: 0 },
      search: { value: 'Searchable', exact: false },
      view: { option: 'all', includeOutdated: false },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].homeName).toBe('Searchable Residence');
  });

  test('returns only active homes in the active homes list', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'VIEW_SENIOR']);

    const location = await createLocation();

    await createHomeThroughApi(token, location, { homeName: 'Active Home' });

    await createHomeThroughApi(token, location, { homeName: 'Blocked Home', isRestricted: true });

    await createHomeThroughApi(token, location, { homeName: 'Closed Home', isClose: true });

    const res = await auth(global.api.get('/api/homes/get-list-of-active-homes'), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toContain('Active Home');
  });

  test('returns active and blocked homes but excludes closed homes from potential homes', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'VIEW_SENIOR']);

    const location = await createLocation();

    await createHomeThroughApi(token, location, { homeName: 'Potential Active' });

    await createHomeThroughApi(token, location, {
      homeName: 'Potential Blocked',
      isRestricted: true,
    });

    await createHomeThroughApi(token, location, { homeName: 'Potential Closed', isClose: true });

    const res = await auth(global.api.get('/api/homes/get-list-of-potential-homes'), token);

    expect(res.status).toBe(200);

    const names = res.body.data.map((item) => item.name);

    expect(names.some((name) => name.includes('Potential Active'))).toBe(true);
    expect(names.some((name) => name.includes('Potential Blocked'))).toBe(true);
    expect(names.some((name) => name.includes('Potential Closed'))).toBe(false);
  });

  test('returns active, blocked, and closed homes in the general homes list', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'VIEW_SENIOR']);

    const location = await createLocation();

    await createHomeThroughApi(token, location, { homeName: 'List Active' });

    await createHomeThroughApi(token, location, { homeName: 'List Blocked', isRestricted: true });

    await createHomeThroughApi(token, location, { homeName: 'List Closed', isClose: true });

    const res = await auth(global.api.get('/api/homes/get-list-of-homes'), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);

    const names = res.body.data.map((item) => item.name);

    expect(names.some((name) => name.includes('List Active'))).toBe(true);
    expect(names.some((name) => name.includes('List Blocked'))).toBe(true);
    expect(names.some((name) => name.includes('List Closed'))).toBe(true);
  });

  test('blocks a home', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'BLOCK_HOME']);

    const location = await createLocation();

    const home = await createHomeThroughApi(token, location, { homeName: 'Block Home' });

    const res = await auth(global.api.patch('/api/homes/block-home'), token).send({
      id: home.id,
      causeOfRestriction: 'Integration block',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.UPDATED', data: null });

    const blocked = await Home.findByPk(home.id, { raw: true });

    expect(blocked.isRestricted).toBe(true);
    expect(blocked.causeOfRestriction).toBe('Integration block');
    expect(blocked.dateOfRestriction).not.toBeNull();
  });

  test('unblocks a home and clears restriction data', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'UNBLOCK_HOME']);

    const location = await createLocation();

    const home = await createHomeThroughApi(token, location, {
      homeName: 'Unblock Home',
      isRestricted: true,
    });

    const res = await auth(global.api.patch('/api/homes/unblock-home'), token).send({
      id: home.id,
    });

    expect(res.status).toBe(200);

    const unblocked = await Home.findByPk(home.id, { raw: true });

    expect(unblocked.isRestricted).toBe(false);
    expect(unblocked.causeOfRestriction).toBeNull();
    expect(unblocked.dateOfRestriction).toBeNull();
  });

  test('reports no dependencies for an unused home and deletes it', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'DELETE_HOME']);

    const location = await createLocation();

    const home = await createHomeThroughApi(token, location, { homeName: 'Delete Home' });

    const check = await auth(
      global.api.get(`/api/homes/check-home-before-delete/${home.id}`),
      token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 0 });

    const deletion = await auth(global.api.delete(`/api/homes/delete-home/${home.id}`), token);

    expect(deletion.status).toBe(200);
    expect(deletion.body).toEqual({ code: 'SUCCESS.DELETED', data: null });
    expect(await Home.findByPk(home.id)).toBeNull();
  });

  test('does not delete a home that has a senior dependency', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'DELETE_HOME']);

    const location = await createLocation();

    const home = await createHomeThroughApi(token, location, { homeName: 'Dependent Home' });

    await Senior.create({
      firstName: 'Dependent',
      patronymic: null,
      lastName: 'Senior',
      gender: 'female',
      homeId: home.id,
    });

    const check = await auth(
      global.api.get(`/api/homes/check-home-before-delete/${home.id}`),
      token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ code: 'ERRORS.HOME.HAS_DEPENDENCIES', data: 1 });

    const deletion = await auth(global.api.delete(`/api/homes/delete-home/${home.id}`), token);

    expect(deletion.status).toBe(409);
    expect(deletion.body).toMatchObject({ code: 'ERRORS.HOME.HAS_DEPENDENCIES' });
    expect(await Home.findByPk(home.id)).not.toBeNull();
  });

  test('groups active homes by region and sorts homes by name', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_HOME', 'ADD_NEW_RECIPIENT']);

    const location = await createLocation({
      regionName: 'Integration Region',
      regionShortName: 'IR',
    });

    await createHomeThroughApi(token, location, { homeName: 'Beta Home' });

    await createHomeThroughApi(token, location, { homeName: 'Alpha Home' });

    await createHomeThroughApi(token, location, { homeName: 'Blocked Home', isRestricted: true });

    const res = await auth(global.api.get('/api/homes/get-home-groups/'), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ regionName: 'Integration Region' });
    expect(res.body.data[0].homes.map((home) => home.homeName)).toEqual([
      'Alpha Home',
      'Beta Home',
    ]);
  });
});
