import jwt from 'jsonwebtoken';

import {
  Country,
  District,
  Home,
  HomeAddress,
  HomeCoordination,
  Locality,
  Partner,
  PartnerAddress,
  PartnerContact,
  PartnerSearch,
  Region,
} from '../../models/index.js';

import { PARTNER_AFFILIATION } from '../../../shared/dist/constants/partners.js';

import { createRole } from './factories/role.js';

import { createOperation } from './factories/operation.js';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'partners-integration-user', role: 'PARTNERS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedRole(operationNames = []) {
  const role = await createRole({ name: 'Partners Test Role' });

  for (const name of new Set(operationNames)) {
    await createOperation({ roleId: role.id, name, access: true, disabled: false });
  }

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

function draftContacts(email = 'partner@example.com') {
  return {
    email: [email],
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

async function createLocation() {
  const country = await Country.create({
    id: 143,
    name: 'Russia',
    shortName: 'RU',
    isRestricted: false,
  });

  const region = await Region.create({
    name: 'Partner Test Region',
    shortName: 'PTR',
    countryId: country.id,
    isRestricted: false,
  });

  const district = await District.create({
    name: 'Partner Test District',
    shortName: 'PTD',
    postName: 'Partner Test District',
    shortPostName: 'PTD',
    regionId: region.id,
    isRestricted: false,
  });

  const locality = await Locality.create({
    name: 'Partner Test Locality',
    shortName: 'PTL',
    isFederalCity: false,
    isCapitalOfRegion: false,
    isCapitalOfDistrict: false,
    districtId: district.id,
    isRestricted: false,
  });

  return { country, region, district, locality };
}

async function createHomeFixture(location, overrides = {}) {
  const home = await Home.create({
    homeName: overrides.homeName ?? 'Partner Test Home',
    officialName: overrides.officialName ?? 'Partner Test Home Official',
    noAddress: false,
    specialHome: false,
    acceptableForSchool: true,
    comment: null,
    infoNote: null,
    isRestricted: overrides.isRestricted ?? false,
    causeOfRestriction: null,
    dateOfRestriction: null,
    isClose: overrides.isClose ?? false,
    dateOfClose: null,
  });

  const address = await HomeAddress.create({
    homeId: home.id,
    countryId: location.country.id,
    regionId: location.region.id,
    districtId: location.district.id,
    localityId: location.locality.id,
    postalName: home.homeName,
    postalCode: '123456',
    postalAddressPart: '10 Test Street',
    fullPostalAddress: '123456, Partner Test Region, 10 Test Street',
    isRestricted: false,
    isRecoverable: true,
  });

  return { home, address };
}

function partnerDraft(location, overrides = {}) {
  return {
    id: null,
    firstName: overrides.firstName ?? 'Alice',
    patronymic: overrides.patronymic ?? null,
    lastName: overrides.lastName ?? 'Partner',
    affiliation: overrides.affiliation ?? PARTNER_AFFILIATION.VOLUNTEER_COORDINATOR,
    position: overrides.position ?? 'Coordinator',
    draftAddress: {
      countryId: overrides.countryId ?? location.country.id,
      regionId: overrides.regionId ?? location.region.id,
      districtId: overrides.districtId ?? location.district.id,
      localityId: overrides.localityId ?? location.locality.id,
    },
    comment: overrides.comment ?? 'Integration partner',
    isRestricted: overrides.isRestricted ?? false,
    causeOfRestriction: overrides.causeOfRestriction ?? null,
    dateOfRestriction: overrides.dateOfRestriction ?? null,
    draftContacts: overrides.draftContacts ?? draftContacts(),
    draftCoordinations: overrides.draftCoordinations ?? [],
  };
}

async function createPartnerThroughApi(token, location, overrides = {}) {
  const payload = partnerDraft(location, overrides);

  const res = await auth(global.api.post('/api/partners/create-partner'), token).send(payload);

  expect(res.status).toBe(201);
  expect(res.body.code).toBe('SUCCESS.CREATED');

  const partner = await Partner.findOne({
    where: { firstName: payload.firstName, lastName: payload.lastName },
  });

  expect(partner).not.toBeNull();

  return { partner, payload, response: res };
}

function emptyUpdateParts() {
  return {
    changingData: { main: null, address: null, contacts: null, coordinations: null },
    restoringData: { addresses: null, names: null, contacts: null, coordinations: null },
    outdatingData: { address: null, names: null, contacts: null, coordinations: null },
    deletingData: { names: null, addresses: null, contacts: null, coordinations: null },
  };
}

function partnersQuery(overrides = {}) {
  return {
    page: { size: 20, number: 0 },
    view: { option: 'all', includeOutdated: false },
    filters: {},
    ...overrides,
  };
}

describe('partners API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .post('/api/partners/check-partner-data')
      .send({ firstName: 'Alice', lastName: 'Partner', contacts: draftContacts() });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks create permission', async () => {
    const { token } = await createAuthorizedRole();

    const location = await createLocation();

    const res = await auth(global.api.post('/api/partners/create-partner'), token).send(
      partnerDraft(location),
    );

    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid partner data', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER']);

    const res = await auth(global.api.post('/api/partners/create-partner'), token).send({
      firstName: '',
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('detects duplicate name and contact and excludes the current partner', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'EDIT_PARTNER']);

    const location = await createLocation();

    const { partner } = await createPartnerThroughApi(token, location);

    const duplicate = await auth(global.api.post('/api/partners/check-partner-data'), token).send({
      firstName: 'Alice',
      lastName: 'Partner',
      contacts: draftContacts(),
    });

    expect(duplicate.status).toBe(200);
    expect(duplicate.body.code).toBe('ERRORS.PARTNER.HAS_DATA_DUPLICATES');
    expect(duplicate.body.data.duplicatesName).toEqual(['Alice Partner']);
    expect(duplicate.body.data.duplicatesContact.length).toBeGreaterThan(0);

    const self = await auth(global.api.post('/api/partners/check-partner-data'), token).send({
      id: partner.id,
      firstName: 'Alice',
      lastName: 'Partner',
      contacts: draftContacts(),
    });

    expect(self.status).toBe(200);
    expect(self.body.data).toEqual({ duplicatesName: [], duplicatesContact: [] });
    expect(self.body.code).toBeUndefined();
  });

  test('creates partner with contact, address, coordination, and search row', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER']);

    const location = await createLocation();

    const { home } = await createHomeFixture(location);

    const { partner } = await createPartnerThroughApi(token, location, {
      draftCoordinations: [home.id],
    });

    const contact = await PartnerContact.findOne({ where: { partnerId: partner.id }, raw: true });

    expect(contact).toMatchObject({
      type: 'email',
      content: 'partner@example.com',
      isRestricted: false,
    });

    const address = await PartnerAddress.findOne({ where: { partnerId: partner.id }, raw: true });

    expect(address).toMatchObject({
      countryId: location.country.id,
      regionId: location.region.id,
      districtId: location.district.id,
      localityId: location.locality.id,
      isRestricted: false,
    });

    const coordination = await HomeCoordination.findOne({
      where: { partnerId: partner.id, homeId: home.id },
      raw: true,
    });

    expect(coordination).toMatchObject({ isRestricted: false, isRecoverable: true });

    const search = await PartnerSearch.findOne({
      where: { partnerId: partner.id, isRestricted: false },
      raw: true,
    });

    expect(search).not.toBeNull();
    expect(search.content).toContain('Alice');
  });

  test('returns partner details by id', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'VIEW_PARTNER']);

    const location = await createLocation();

    const { home } = await createHomeFixture(location);

    const { partner } = await createPartnerThroughApi(token, location, {
      draftCoordinations: [home.id],
    });

    const res = await auth(global.api.get(`/api/partners/get-partner-by-id/${partner.id}`), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: partner.id,
      firstName: 'Alice',
      lastName: 'Partner',
      affiliation: PARTNER_AFFILIATION.VOLUNTEER_COORDINATOR,
      position: 'Coordinator',
      isRestricted: false,
    });
    expect(res.body.data.orderedContacts.email[0].content).toBe('partner@example.com');
    expect(res.body.data.coordinations).toHaveLength(1);
  });

  test('updates partner main data and refreshes search content', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'EDIT_PARTNER']);

    const location = await createLocation();

    const { partner } = await createPartnerThroughApi(token, location);

    const parts = emptyUpdateParts();

    parts.changingData.main = {
      firstName: 'Alicia',
      position: 'Senior Coordinator',
      comment: 'Updated partner',
    };

    const res = await auth(global.api.post('/api/partners/update-partner'), token).send({
      id: partner.id,
      ...parts,
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SUCCESS.UPDATED');

    const updated = await Partner.findByPk(partner.id, { raw: true });

    expect(updated).toMatchObject({
      firstName: 'Alicia',
      position: 'Senior Coordinator',
      comment: 'Updated partner',
    });

    const search = await PartnerSearch.findOne({
      where: { partnerId: partner.id, isRestricted: false },
      raw: true,
    });

    expect(search.content).toContain('Alicia');
  });

  test('returns paginated partners and respects only-active view', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'VIEW_LIMITED_PARTNERS_LIST']);

    const location = await createLocation();

    const first = await createPartnerThroughApi(token, location, {
      firstName: 'Active',
      lastName: 'Partner',
      draftContacts: draftContacts('active@example.com'),
    });

    await createPartnerThroughApi(token, location, {
      firstName: 'Blocked',
      lastName: 'Partner',
      isRestricted: true,
      causeOfRestriction: 'Integration test',
      dateOfRestriction: '2026-01-01',
      draftContacts: draftContacts('blocked@example.com'),
    });

    const res = await auth(global.api.post('/api/partners/get-partners'), token).send(
      partnersQuery({ view: { option: 'only-active', includeOutdated: false } }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].id).toBe(first.partner.id);
  });

  test('searches partners through PartnerSearch content', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'VIEW_LIMITED_PARTNERS_LIST']);

    const location = await createLocation();

    await createPartnerThroughApi(token, location, {
      firstName: 'Searchable',
      lastName: 'Person',
      draftContacts: draftContacts('searchable@example.com'),
    });

    await createPartnerThroughApi(token, location, {
      firstName: 'Different',
      lastName: 'Person',
      draftContacts: draftContacts('different@example.com'),
    });

    const res = await auth(global.api.post('/api/partners/get-partners'), token).send(
      partnersQuery({ search: { value: 'Searchable', exact: false } }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list[0].firstName).toBe('Searchable');
  });

  test('returns only active partners in active-partners list', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'VIEW_HOME']);

    const location = await createLocation();

    const active = await createPartnerThroughApi(token, location, {
      firstName: 'Active',
      draftContacts: draftContacts('active@example.com'),
    });

    await createPartnerThroughApi(token, location, {
      firstName: 'Blocked',
      isRestricted: true,
      causeOfRestriction: 'Blocked',
      dateOfRestriction: '2026-01-01',
      draftContacts: draftContacts('blocked@example.com'),
    });

    const res = await auth(global.api.get('/api/partners/get-list-of-active-partners'), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: active.partner.id, name: 'Active Partner' }]);
  });

  test('returns active and blocked partners in general partner list', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'VIEW_HOME']);

    const location = await createLocation();

    const active = await createPartnerThroughApi(token, location, {
      firstName: 'Active',
      draftContacts: draftContacts('active@example.com'),
    });

    const blocked = await createPartnerThroughApi(token, location, {
      firstName: 'Blocked',
      isRestricted: true,
      causeOfRestriction: 'Blocked',
      dateOfRestriction: '2026-01-01',
      draftContacts: draftContacts('blocked@example.com'),
    });

    const res = await auth(global.api.get('/api/partners/get-list-of-partners'), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        { id: active.partner.id, name: 'Active Partner', isRestricted: false },
        { id: blocked.partner.id, name: 'Blocked Partner', isRestricted: true },
      ]),
    );
  });

  test('reports active coordination before blocking partner', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'BLOCK_PARTNER']);

    const location = await createLocation();

    const { home } = await createHomeFixture(location);

    const { partner } = await createPartnerThroughApi(token, location, {
      draftCoordinations: [home.id],
    });

    const res = await auth(
      global.api.get(`/api/partners/check-partner-before-block/${partner.id}`),
      token,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: 1, code: 'ERRORS.PARTNER.HAS_DEPENDENCIES' });
  });

  test('blocks partner and restricts its coordinations', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'BLOCK_PARTNER']);

    const location = await createLocation();

    const { home } = await createHomeFixture(location);

    const { partner } = await createPartnerThroughApi(token, location, {
      draftCoordinations: [home.id],
    });

    const res = await auth(global.api.patch('/api/partners/block-partner'), token).send({
      id: partner.id,
      causeOfRestriction: 'Integration block',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.UPDATED', data: null });

    const blockedPartner = await Partner.findByPk(partner.id, { raw: true });

    expect(blockedPartner.isRestricted).toBe(true);
    expect(blockedPartner.causeOfRestriction).toBe('Integration block');

    const coordination = await HomeCoordination.findOne({
      where: { partnerId: partner.id, homeId: home.id },
      raw: true,
    });

    expect(coordination.isRestricted).toBe(true);
  });

  test('unblocks partner and makes its coordinations recoverable', async () => {
    const { token } = await createAuthorizedRole([
      'ADD_NEW_PARTNER',
      'BLOCK_PARTNER',
      'UNBLOCK_PARTNER',
    ]);

    const location = await createLocation();

    const { home } = await createHomeFixture(location);

    const { partner } = await createPartnerThroughApi(token, location, {
      draftCoordinations: [home.id],
    });

    await auth(global.api.patch('/api/partners/block-partner'), token).send({
      id: partner.id,
      causeOfRestriction: 'Integration block',
    });

    const res = await auth(global.api.patch('/api/partners/unblock-partner'), token).send({
      id: partner.id,
    });

    expect(res.status).toBe(200);

    const restoredPartner = await Partner.findByPk(partner.id, { raw: true });

    expect(restoredPartner.isRestricted).toBe(false);
    expect(restoredPartner.causeOfRestriction).toBeNull();
    expect(restoredPartner.dateOfRestriction).toBeNull();

    const coordination = await HomeCoordination.findOne({
      where: { partnerId: partner.id, homeId: home.id },
      raw: true,
    });

    expect(coordination.isRestricted).toBe(true);
    expect(coordination.isRecoverable).toBe(true);
  });

  test('checks and deletes a partner without dependencies', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'DELETE_PARTNER']);

    const location = await createLocation();

    const { partner } = await createPartnerThroughApi(token, location);

    const check = await auth(
      global.api.get(`/api/partners/check-partner-before-delete/${partner.id}`),
      token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 0 });

    const deletion = await auth(
      global.api.delete(`/api/partners/delete-partner/${partner.id}`),
      token,
    );

    expect(deletion.status).toBe(200);
    expect(deletion.body).toEqual({ code: 'SUCCESS.DELETED', data: null });
    expect(await Partner.findByPk(partner.id)).toBeNull();
  });

  test('does not delete a partner that has home coordination dependency', async () => {
    const { token } = await createAuthorizedRole(['ADD_NEW_PARTNER', 'DELETE_PARTNER']);

    const location = await createLocation();

    const { home } = await createHomeFixture(location);

    const { partner } = await createPartnerThroughApi(token, location, {
      draftCoordinations: [home.id],
    });

    const check = await auth(
      global.api.get(`/api/partners/check-partner-before-delete/${partner.id}`),
      token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 1, code: 'ERRORS.PARTNER.HAS_DEPENDENCIES' });

    const deletion = await auth(
      global.api.delete(`/api/partners/delete-partner/${partner.id}`),
      token,
    );

    expect(deletion.status).toBe(409);
    expect(deletion.body).toMatchObject({ code: 'ERRORS.PARTNER.HAS_DEPENDENCIES' });
    expect(await Partner.findByPk(partner.id)).not.toBeNull();
  });
});
