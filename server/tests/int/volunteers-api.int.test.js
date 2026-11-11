import jwt from 'jsonwebtoken';

import {
  Country,
  District,
  Locality,
  Occasion,
  Order,
  Region,
  User,
  Volunteer,
  VolunteerAddress,
  VolunteerContact,
  VolunteerCooperation,
  VolunteerInstitute,
  VolunteerSearch,
  VolunteerSubscription,
} from '../../models/index.js';

import { INSTITUTE_CATEGORY } from '../../../shared/dist/constants/volunteers.js';

import { ORDER_SOURCE, ORDER_STATUS } from '../../../shared/dist/constants/orders.js';

import { hashPassword } from '../../security/passwords.mjs';

import { createRole } from './factories/role.js';

import { createOperation } from './factories/operation.js';

const PASSWORD = 'Password123';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'volunteers-integration-user', role: 'VOLUNTEERS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedActor(operationNames = []) {
  const role = await createRole({ name: 'Volunteers Test Role' });

  for (const name of new Set(operationNames)) {
    await createOperation({ roleId: role.id, name, access: true, disabled: false });
  }

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

async function createLocation() {
  const country = await Country.create({
    id: 143,
    name: 'Russia',
    shortName: 'RU',
    isRestricted: false,
  });

  const region = await Region.create({
    name: 'Volunteer Test Region',
    shortName: 'VTR',
    countryId: country.id,
    isRestricted: false,
  });

  const district = await District.create({
    name: 'Volunteer Test District',
    shortName: 'VTD',
    postName: 'Volunteer Test District',
    shortPostName: 'VTD',
    regionId: region.id,
    isRestricted: false,
  });

  const locality = await Locality.create({
    name: 'Volunteer Test Locality',
    shortName: 'VTL',
    isFederalCity: false,
    isCapitalOfRegion: false,
    isCapitalOfDistrict: false,
    districtId: district.id,
    isRestricted: false,
  });

  return { country, region, district, locality };
}

async function createUserFixture(roleId, userName) {
  return User.create({
    userName,
    password: await hashPassword(PASSWORD),
    firstName: 'Volunteer',
    patronymic: null,
    lastName: 'User',
    roleId,
    comment: null,
    isRestricted: false,
    causeOfRestriction: null,
    dateOfRestriction: null,
  });
}

function draftContacts(email = 'volunteer@example.com') {
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

function volunteerDraft(location, overrides = {}) {
  const isRestricted = overrides.isRestricted ?? false;

  return {
    id: null,
    firstName: overrides.firstName ?? 'Alice',
    patronymic: overrides.patronymic ?? null,
    lastName: overrides.lastName ?? 'Volunteer',
    draftAddress: {
      countryId: location.country.id,
      regionId: location.region.id,
      districtId: location.district.id,
      localityId: location.locality.id,
    },
    comment: overrides.comment ?? null,
    isRestricted,
    causeOfRestriction: isRestricted
      ? (overrides.causeOfRestriction ?? 'Integration restriction')
      : null,
    dateOfRestriction: isRestricted
      ? (overrides.dateOfRestriction ?? '2026-01-01T00:00:00.000Z')
      : null,
    draftContacts: overrides.draftContacts ?? draftContacts(),
    draftInstitutes: overrides.draftInstitutes ?? [],
    draftSubscriptions: overrides.draftSubscriptions ?? [],
    draftCooperations: overrides.draftCooperations ?? [],
  };
}

async function createVolunteerThroughApi(actor, location, overrides = {}) {
  const payload = volunteerDraft(location, overrides);

  const res = await auth(global.api.post('/api/volunteers/create-volunteer'), actor.token).send(
    payload,
  );

  expect(res.status).toBe(201);
  expect(res.body.code).toBe('SUCCESS.CREATED');

  const volunteer = await Volunteer.findOne({
    where: { firstName: payload.firstName, lastName: payload.lastName },
  });

  expect(volunteer).not.toBeNull();

  return { volunteer, payload, response: res };
}

function emptyUpdateParts() {
  return {
    changingData: {
      main: null,
      address: null,
      contacts: null,
      institutes: null,
      subscriptions: null,
      cooperations: null,
    },
    restoringData: { addresses: null, names: null, contacts: null, institutes: null },
    outdatingData: { address: null, names: null, contacts: null, institutes: null },
    deletingData: {
      names: null,
      addresses: null,
      contacts: null,
      institutes: null,
      subscriptions: null,
    },
  };
}

function volunteersQuery(overrides = {}) {
  return {
    page: { size: 20, number: 0 },
    sort: [{ field: 'name', direction: 'asc' }],
    view: { option: 'all', includeOutdated: false },
    filters: {},
    ...overrides,
  };
}

async function createBasicFixture(actor) {
  const location = await createLocation();

  return { actor, location };
}

async function createOrderDependency(actor, volunteer) {
  const user = await createUserFixture(actor.role.id, 'order_dependency_user');

  const occasion = await Occasion.create({ type: 1, month: 11, year: 2027, status: 1, amount: 0 });

  const contact = await VolunteerContact.findOne({
    where: { volunteerId: volunteer.id, isRestricted: false },
  });

  expect(contact).not.toBeNull();

  return Order.create({
    occasionId: occasion.id,
    volunteerId: volunteer.id,
    userId: user.id,
    instituteId: null,
    contactId: contact.id,
    amount: 1,
    status: ORDER_STATUS.PENDING,
    source: ORDER_SOURCE.WEBSITE,
    comment: null,
  });
}

describe('volunteers API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .post('/api/volunteers/check-volunteer-data')
      .send({ id: null, firstName: 'Alice', lastName: 'Volunteer', contacts: draftContacts() });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when role lacks create permission', async () => {
    const actor = await createAuthorizedActor();

    const fixture = await createBasicFixture(actor);

    const res = await auth(global.api.post('/api/volunteers/create-volunteer'), actor.token).send(
      volunteerDraft(fixture.location),
    );

    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid volunteer data', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER']);

    const res = await auth(global.api.post('/api/volunteers/create-volunteer'), actor.token).send({
      firstName: '',
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('detects duplicate name and contact and excludes self', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'EDIT_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Alice',
      lastName: 'Volunteer',
      draftContacts: draftContacts('duplicate@example.com'),
    });

    const duplicate = await auth(
      global.api.post('/api/volunteers/check-volunteer-data'),
      actor.token,
    ).send({
      id: null,
      firstName: 'Alice',
      lastName: 'Volunteer',
      contacts: draftContacts('duplicate@example.com'),
    });

    expect(duplicate.status).toBe(200);
    expect(duplicate.body.code).toBe('ERRORS.VOLUNTEER.HAS_DATA_DUPLICATES');
    expect(duplicate.body.data.duplicatesName).toHaveLength(1);
    expect(duplicate.body.data.duplicatesContact.length).toBeGreaterThan(0);

    const self = await auth(
      global.api.post('/api/volunteers/check-volunteer-data'),
      actor.token,
    ).send({
      id: created.volunteer.id,
      firstName: 'Alice',
      lastName: 'Volunteer',
      contacts: draftContacts('duplicate@example.com'),
    });

    expect(self.status).toBe(200);
    expect(self.body.data.duplicatesName).toHaveLength(0);
    expect(self.body.data.duplicatesContact).toHaveLength(0);
  });

  test('creates volunteer with address, contact, institute, subscription, cooperation and search row', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const subscribedUser = await createUserFixture(actor.role.id, 'subscribed_user');

    const cooperationUser = await createUserFixture(actor.role.id, 'cooperation_user');

    const created = await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Complete',
      lastName: 'Volunteer',
      draftContacts: draftContacts('complete@example.com'),
      draftInstitutes: [
        { instituteName: 'Integration School', category: INSTITUTE_CATEGORY.SCHOOL },
      ],
      draftSubscriptions: [subscribedUser.id],
      draftCooperations: [cooperationUser.id],
    });

    const volunteerId = created.volunteer.id;

    expect(await VolunteerContact.count({ where: { volunteerId } })).toBe(1);
    expect(await VolunteerAddress.count({ where: { volunteerId } })).toBe(1);
    expect(await VolunteerInstitute.count({ where: { volunteerId } })).toBe(1);
    expect(
      await VolunteerSubscription.count({ where: { volunteerId, userId: subscribedUser.id } }),
    ).toBe(1);
    expect(
      await VolunteerCooperation.count({ where: { volunteerId, userId: cooperationUser.id } }),
    ).toBe(1);

    const search = await VolunteerSearch.findOne({
      where: { volunteerId, isRestricted: false },
      raw: true,
    });

    expect(search).not.toBeNull();
    expect(search.content).toContain('Complete');
    expect(search.content).toContain('complete@example.com');
    expect(search.content).toContain('Integration School');
  });

  test('returns volunteer details by id', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'VIEW_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location);

    const res = await auth(
      global.api.get(`/api/volunteers/get-volunteer-by-id/${created.volunteer.id}`),
      actor.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: created.volunteer.id,
      firstName: 'Alice',
      lastName: 'Volunteer',
      isRestricted: false,
    });
    expect(res.body.data.orderedContacts.email).toHaveLength(1);
    expect(res.body.data.address.country.id).toBe(fixture.location.country.id);
  });

  test('updates main volunteer data and refreshes search', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'EDIT_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location);

    const parts = emptyUpdateParts();

    parts.changingData.main = { firstName: 'Alicia', comment: 'Updated volunteer comment' };

    const res = await auth(global.api.post('/api/volunteers/update-volunteer'), actor.token).send({
      id: created.volunteer.id,
      ...parts,
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SUCCESS.UPDATED');

    const updated = await Volunteer.findByPk(created.volunteer.id, { raw: true });

    expect(updated).toMatchObject({ firstName: 'Alicia', comment: 'Updated volunteer comment' });

    const search = await VolunteerSearch.findOne({
      where: { volunteerId: created.volunteer.id, isRestricted: false },
      raw: true,
    });

    expect(search.content).toContain('Alicia');
    expect(search.content).toContain('Updated volunteer comment');
  });

  test('adds related contact and institute during update', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'EDIT_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location);

    const parts = emptyUpdateParts();

    parts.changingData.contacts = { email: ['second@example.com'] };

    parts.changingData.institutes = [
      { instituteName: 'Second Integration School', category: INSTITUTE_CATEGORY.SCHOOL },
    ];

    const res = await auth(global.api.post('/api/volunteers/update-volunteer'), actor.token).send({
      id: created.volunteer.id,
      ...parts,
    });

    expect(res.status).toBe(200);
    expect(await VolunteerContact.count({ where: { volunteerId: created.volunteer.id } })).toBe(2);
    expect(await VolunteerInstitute.count({ where: { volunteerId: created.volunteer.id } })).toBe(
      1,
    );

    const search = await VolunteerSearch.findOne({
      where: { volunteerId: created.volunteer.id, isRestricted: false },
      raw: true,
    });

    expect(search.content).toContain('second@example.com');
    expect(search.content).toContain('Second Integration School');
  });

  test('searches volunteers through VolunteerSearch content', async () => {
    const actor = await createAuthorizedActor([
      'ADD_NEW_VOLUNTEER',
      'VIEW_LIMITED_VOLUNTEERS_LIST',
    ]);

    const fixture = await createBasicFixture(actor);

    await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'SearchTarget',
      lastName: 'Volunteer',
      draftContacts: draftContacts('target@example.com'),
    });

    await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Different',
      lastName: 'Volunteer',
      draftContacts: draftContacts('different@example.com'),
    });

    const res = await auth(global.api.post('/api/volunteers/get-volunteers'), actor.token).send(
      volunteersQuery({
        search: { value: 'SearchTarget', exact: false },
        view: { option: 'only-active', includeOutdated: false },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].firstName).toBe('SearchTarget');
  });

  test('filters volunteers by institute category', async () => {
    const actor = await createAuthorizedActor([
      'ADD_NEW_VOLUNTEER',
      'VIEW_LIMITED_VOLUNTEERS_LIST',
    ]);

    const fixture = await createBasicFixture(actor);

    await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'School',
      draftContacts: draftContacts('school@example.com'),
      draftInstitutes: [{ instituteName: 'Category School', category: INSTITUTE_CATEGORY.SCHOOL }],
    });

    await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Business',
      draftContacts: draftContacts('business@example.com'),
      draftInstitutes: [{ instituteName: 'Business Group', category: INSTITUTE_CATEGORY.BUSINESS }],
    });

    const res = await auth(global.api.post('/api/volunteers/get-volunteers'), actor.token).send(
      volunteersQuery({ filters: { general: { categories: [INSTITUTE_CATEGORY.SCHOOL] } } }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list[0].firstName).toBe('School');
  });

  test('filters volunteers by subscription user', async () => {
    const actor = await createAuthorizedActor([
      'ADD_NEW_VOLUNTEER',
      'VIEW_LIMITED_VOLUNTEERS_LIST',
    ]);

    const fixture = await createBasicFixture(actor);

    const user = await createUserFixture(actor.role.id, 'subscription_filter_user');

    await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Subscribed',
      draftContacts: draftContacts('subscribed@example.com'),
      draftSubscriptions: [user.id],
    });

    await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Unsubscribed',
      draftContacts: draftContacts('unsubscribed@example.com'),
    });

    const res = await auth(global.api.post('/api/volunteers/get-volunteers'), actor.token).send(
      volunteersQuery({ filters: { general: { subscriptions: [user.id] } } }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list[0].firstName).toBe('Subscribed');
  });

  test('searches volunteer contacts for order selection', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'ADD_NEW_ORDER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location, {
      draftContacts: draftContacts('special.contact@example.com'),
    });

    const res = await auth(global.api.get('/api/volunteers/search-contacts/special'), actor.token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      volunteerId: created.volunteer.id,
      type: 'email',
      content: 'special.contact@example.com',
    });
  });

  test('checks and deletes volunteer without order dependencies', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'DELETE_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location);

    const check = await auth(
      global.api.get(`/api/volunteers/check-volunteer-before-delete/${created.volunteer.id}`),
      actor.token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 0 });

    const deletion = await auth(
      global.api.delete(`/api/volunteers/delete-volunteer/${created.volunteer.id}`),
      actor.token,
    );

    expect(deletion.status).toBe(200);
    expect(deletion.body).toEqual({ code: 'SUCCESS.DELETED', data: null });
    expect(await Volunteer.findByPk(created.volunteer.id)).toBeNull();
  });

  test('does not delete volunteer with order dependency', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'DELETE_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location);

    await createOrderDependency(actor, created.volunteer);

    const check = await auth(
      global.api.get(`/api/volunteers/check-volunteer-before-delete/${created.volunteer.id}`),
      actor.token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 1, code: 'ERRORS.VOLUNTEER.HAS_DEPENDENCIES' });

    const deletion = await auth(
      global.api.delete(`/api/volunteers/delete-volunteer/${created.volunteer.id}`),
      actor.token,
    );

    expect(deletion.status).toBe(409);
    expect(await Volunteer.findByPk(created.volunteer.id)).not.toBeNull();
  });

  test('blocks volunteer and refreshes search content', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_VOLUNTEER', 'BLOCK_VOLUNTEER']);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location);

    const res = await auth(global.api.patch('/api/volunteers/block-volunteer'), actor.token).send({
      id: created.volunteer.id,
      causeOfRestriction: 'Integration blocking',
    });

    expect(res.status).toBe(200);

    const blocked = await Volunteer.findByPk(created.volunteer.id, { raw: true });

    expect(blocked.isRestricted).toBe(true);
    expect(blocked.causeOfRestriction).toBe('Integration blocking');
    expect(blocked.dateOfRestriction).not.toBeNull();

    const search = await VolunteerSearch.findOne({
      where: { volunteerId: created.volunteer.id, isRestricted: false },
      raw: true,
    });

    expect(search.content).toContain('blocked');
  });

  test('unblocks volunteer and refreshes search content', async () => {
    const actor = await createAuthorizedActor([
      'ADD_NEW_VOLUNTEER',
      'BLOCK_VOLUNTEER',
      'UNBLOCK_VOLUNTEER',
    ]);

    const fixture = await createBasicFixture(actor);

    const created = await createVolunteerThroughApi(actor, fixture.location);

    await auth(global.api.patch('/api/volunteers/block-volunteer'), actor.token).send({
      id: created.volunteer.id,
      causeOfRestriction: 'Integration blocking',
    });

    const res = await auth(global.api.patch('/api/volunteers/unblock-volunteer'), actor.token).send(
      { id: created.volunteer.id },
    );

    expect(res.status).toBe(200);

    const restored = await Volunteer.findByPk(created.volunteer.id, { raw: true });

    expect(restored.isRestricted).toBe(false);
    expect(restored.causeOfRestriction).toBeNull();
    expect(restored.dateOfRestriction).toBeNull();

    const search = await VolunteerSearch.findOne({
      where: { volunteerId: created.volunteer.id, isRestricted: false },
      raw: true,
    });

    expect(search.content).not.toContain('blocked');
  });

  test('returns only blocked volunteers for blocked view', async () => {
    const actor = await createAuthorizedActor([
      'ADD_NEW_VOLUNTEER',
      'BLOCK_VOLUNTEER',
      'VIEW_LIMITED_VOLUNTEERS_LIST',
    ]);

    const fixture = await createBasicFixture(actor);

    const blocked = await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Blocked',
      draftContacts: draftContacts('blocked@example.com'),
    });

    await createVolunteerThroughApi(actor, fixture.location, {
      firstName: 'Active',
      draftContacts: draftContacts('active@example.com'),
    });

    await auth(global.api.patch('/api/volunteers/block-volunteer'), actor.token).send({
      id: blocked.volunteer.id,
      causeOfRestriction: 'Integration blocking',
    });

    const res = await auth(global.api.post('/api/volunteers/get-volunteers'), actor.token).send(
      volunteersQuery({ view: { option: 'only-blocked', includeOutdated: false } }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].id).toBe(blocked.volunteer.id);
    expect(res.body.data.list[0].isRestricted).toBe(true);
  });
});
