import jwt from 'jsonwebtoken';

import {
  Country,
  District,
  Home,
  HomeAddress,
  Locality,
  Occasion,
  Recipient,
  Region,
  Senior,
  SeniorSearch,
} from '../../models/index.js';

import { OCCASION_STATUS } from '../../../shared/dist/constants/occasions.js';

import { createRole } from './factories/role.js';

import { createOperation } from './factories/operation.js';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'seniors-integration-user', role: 'SENIORS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedActor(operationNames = []) {
  const role = await createRole({ name: 'Seniors Test Role' });

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
    name: 'Senior Test Region',
    shortName: 'STR',
    countryId: country.id,
    isRestricted: false,
  });

  const district = await District.create({
    name: 'Senior Test District',
    shortName: 'STD',
    postName: 'Senior Test District',
    shortPostName: 'STD',
    regionId: region.id,
    isRestricted: false,
  });

  const locality = await Locality.create({
    name: 'Senior Test Locality',
    shortName: 'STL',
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
    homeName: overrides.homeName ?? 'Senior Test Home',
    officialName: overrides.officialName ?? 'Senior Test Home Official',
    noAddress: overrides.noAddress ?? false,
    specialHome: overrides.specialHome ?? false,
    acceptableForSchool: overrides.acceptableForSchool ?? true,
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
    postalAddressPart: '10 Senior Street',
    fullPostalAddress: '123456, Senior Test Region, 10 Senior Street',
    isRestricted: false,
    isRecoverable: true,
  });

  return { home, address };
}

function seniorDraft(homeId, overrides = {}) {
  const isRestricted = overrides.isRestricted ?? false;

  return {
    id: null,
    firstName: overrides.firstName ?? 'Alice',
    patronymic: overrides.patronymic ?? null,
    lastName: overrides.lastName ?? 'Senior',
    birthDate: overrides.birthDate ?? '1940-11-15',
    confirmedFirstName: false,
    confirmedPatronymic: false,
    confirmedLastName: false,
    confirmedBirthDate: false,
    gender: overrides.gender ?? 'female',
    comment: overrides.comment ?? null,
    infoNote: null,
    photoLink: null,
    dateOfConsent: null,
    personalNoAddr: overrides.personalNoAddr ?? false,
    isRestricted,
    causeOfRestriction: isRestricted
      ? (overrides.causeOfRestriction ?? 'Integration restriction')
      : null,
    dateOfRestriction: isRestricted
      ? (overrides.dateOfRestriction ?? '2026-01-01T00:00:00.000Z')
      : null,
    kindergarten: null,
    teacher: null,
    veteran: null,
    childOfWar: null,
    profession: null,
    honoraryStatus: null,
    interests: null,
    orthodoxBeliever: null,
    dateOfStart: overrides.dateOfStart ?? '2026-01-01T00:00:00.000Z',
    dateOfExit: overrides.dateOfExit ?? null,
    homeId,
    spouseId: overrides.spouseId ?? null,
  };
}

async function createSeniorThroughApi(token, homeId, overrides = {}) {
  const payload = seniorDraft(homeId, overrides);

  const res = await auth(global.api.post('/api/seniors/create-senior'), token).send(payload);

  expect(res.status).toBe(201);
  expect(res.body.code).toBe('SUCCESS.CREATED');

  const senior = await Senior.findOne({ where: { firstName: payload.firstName, homeId } });

  expect(senior).not.toBeNull();

  return { senior, payload, response: res };
}

function emptyUpdateParts() {
  return {
    changingData: { main: null },
    restoringData: { names: null },
    outdatingData: { names: null },
    deletingData: { names: null },
  };
}

function seniorsQuery(overrides = {}) {
  return {
    page: { size: 20, number: 0 },
    sort: [{ field: 'name', direction: 'asc' }],
    view: { option: 'all', homeOption: 'all', includeOutdated: false },
    filters: {},
    ...overrides,
  };
}

async function createOccasionFixture(overrides = {}) {
  return Occasion.create({
    type: overrides.type ?? 1,
    month: overrides.month ?? 11,
    year: overrides.year ?? 2027,
    status: overrides.status ?? OCCASION_STATUS.OPEN,
    amount: overrides.amount ?? 0,
  });
}

async function createRecipientFixture(fixture, senior, occasion, overrides = {}) {
  return Recipient.create({
    fullNameSnapshot:
      overrides.fullNameSnapshot ?? `${senior.lastName ?? ''} ${senior.firstName}`.trim(),
    daySnapshot: overrides.daySnapshot ?? 15,
    monthSnapshot: overrides.monthSnapshot ?? 11,
    yearSnapshot: overrides.yearSnapshot ?? 1940,
    regionIdSnapshot: fixture.location.region.id,
    homeIdSnapshot: fixture.home.id,
    addressSnapshot: fixture.address.fullPostalAddress,
    category: overrides.category ?? 'gen_old_female',
    specialComment: overrides.specialComment ?? '',
    acceptableForSchool: overrides.acceptableForSchool ?? true,
    isAbsent: overrides.isAbsent ?? false,
    plusAmount: overrides.plusAmount ?? 0,
    seniorId: senior.id,
    occasionId: occasion.id,
  });
}

async function createBasicFixture(actor) {
  const location = await createLocation();

  const { home, address } = await createHomeFixture(location);

  return { actor, location, home, address };
}

describe('seniors API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .post('/api/seniors/check-senior-data')
      .send({
        homeId: 1,
        firstName: 'Alice',
        patronymic: null,
        lastName: 'Senior',
        birthDate: '1940-11-15',
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when role lacks create permission', async () => {
    const actor = await createAuthorizedActor();

    const fixture = await createBasicFixture(actor);

    const res = await auth(global.api.post('/api/seniors/create-senior'), actor.token).send(
      seniorDraft(fixture.home.id),
    );

    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid senior data', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR']);

    const res = await auth(global.api.post('/api/seniors/create-senior'), actor.token).send({
      firstName: '',
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('detects duplicate senior data and excludes the current senior', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'EDIT_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id);

    const duplicate = await auth(
      global.api.post('/api/seniors/check-senior-data'),
      actor.token,
    ).send({
      homeId: fixture.home.id,
      firstName: 'Alice',
      patronymic: null,
      lastName: 'Senior',
      birthDate: '1940-11-15',
    });

    expect(duplicate.status).toBe(200);
    expect(duplicate.body.code).toBe('ERRORS.SENIOR.HAS_DATA_DUPLICATES');
    expect(duplicate.body.data.duplicatesName).toHaveLength(1);

    const self = await auth(global.api.post('/api/seniors/check-senior-data'), actor.token).send({
      id: senior.id,
      homeId: fixture.home.id,
      firstName: 'Alice',
      patronymic: null,
      lastName: 'Senior',
      birthDate: '1940-11-15',
    });

    expect(self.status).toBe(200);
    expect(self.body).toEqual({ data: { duplicatesName: [] } });
  });

  test('creates senior and current search row', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Searchable',
      lastName: 'Senior',
      comment: 'Special integration note',
    });

    const search = await SeniorSearch.findOne({
      where: { seniorId: senior.id, isRestricted: false },
      raw: true,
    });

    expect(search).not.toBeNull();
    expect(search.content).toContain('Searchable');
    expect(search.content).toContain(fixture.home.homeName);
  });

  test('creates senior with symmetric spouse relationship', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const spouseResult = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Bob',
      lastName: 'Spouse',
      gender: 'male',
    });

    const seniorResult = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Alice',
      lastName: 'Partner',
      spouseId: spouseResult.senior.id,
    });

    const spouse = await Senior.findByPk(spouseResult.senior.id, { raw: true });

    const senior = await Senior.findByPk(seniorResult.senior.id, { raw: true });

    expect(senior.spouseId).toBe(spouse.id);
    expect(spouse.spouseId).toBe(senior.id);
  });

  test('returns senior details by id', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'VIEW_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id);

    const res = await auth(
      global.api.get(`/api/seniors/get-senior-by-id/${senior.id}`),
      actor.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: senior.id,
      firstName: 'Alice',
      lastName: 'Senior',
      homeId: fixture.home.id,
      isRestricted: false,
      spouseId: null,
      home: { homeName: fixture.home.homeName },
      address: { fullPostalAddress: fixture.address.fullPostalAddress },
    });
  });

  test('updates main senior data and refreshes search content', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'EDIT_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id);

    const parts = emptyUpdateParts();

    parts.changingData.main = { firstName: 'Alicia', comment: 'Updated senior comment' };

    const res = await auth(global.api.post('/api/seniors/update-senior'), actor.token).send({
      id: senior.id,
      ...parts,
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SUCCESS.UPDATED');

    const updated = await Senior.findByPk(senior.id, { raw: true });

    expect(updated).toMatchObject({ firstName: 'Alicia', comment: 'Updated senior comment' });

    const search = await SeniorSearch.findOne({
      where: { seniorId: senior.id, isRestricted: false },
      raw: true,
    });

    expect(search.content).toContain('Alicia');
    expect(search.content).not.toContain('Alice ');
  });

  test('detaches spouse relationship symmetrically on update', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'EDIT_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const spouseResult = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Bob',
      lastName: 'Spouse',
      gender: 'male',
    });

    const seniorResult = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Alice',
      lastName: 'Partner',
      spouseId: spouseResult.senior.id,
    });

    const parts = emptyUpdateParts();

    parts.changingData.main = { spouseId: null };

    const res = await auth(global.api.post('/api/seniors/update-senior'), actor.token).send({
      id: seniorResult.senior.id,
      ...parts,
    });

    expect(res.status).toBe(200);

    const senior = await Senior.findByPk(seniorResult.senior.id, { raw: true });

    const spouse = await Senior.findByPk(spouseResult.senior.id, { raw: true });

    expect(senior.spouseId).toBeNull();
    expect(spouse.spouseId).toBeNull();
  });

  test('searches seniors through SeniorSearch content', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'VIEW_LIMITED_SENIORS_LIST']);

    const fixture = await createBasicFixture(actor);

    await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'SearchTarget',
      lastName: 'Senior',
    });

    await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Different',
      lastName: 'Senior',
    });

    const res = await auth(global.api.post('/api/seniors/get-seniors'), actor.token).send(
      seniorsQuery({
        search: { value: 'SearchTarget', exact: false },
        view: { option: 'only-active', homeOption: 'only-active', includeOutdated: false },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].firstName).toBe('SearchTarget');
  });

  test('returns only non-discharged seniors in home senior list', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'VIEW_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const active = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Active',
    });

    await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Discharged',
      dateOfExit: '2026-10-01T00:00:00.000Z',
    });

    const res = await auth(
      global.api.get(`/api/seniors/get-list-of-seniors/${fixture.home.id}`),
      actor.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: active.senior.id, name: 'Active Senior' }]);
  });

  test('checks and deletes senior without dependencies', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'DELETE_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id);

    const check = await auth(
      global.api.get(`/api/seniors/check-senior-before-delete/${senior.id}`),
      actor.token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 0 });

    const deletion = await auth(
      global.api.delete(`/api/seniors/delete-senior/${senior.id}`),
      actor.token,
    );

    expect(deletion.status).toBe(200);
    expect(deletion.body).toEqual({ code: 'SUCCESS.DELETED', data: null });
    expect(await Senior.findByPk(senior.id)).toBeNull();
  });

  test('does not delete senior with recipient dependencies', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'DELETE_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id);

    const occasion = await createOccasionFixture();

    await createRecipientFixture(fixture, senior, occasion);

    const check = await auth(
      global.api.get(`/api/seniors/check-senior-before-delete/${senior.id}`),
      actor.token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 1, code: 'ERRORS.SENIOR.HAS_DEPENDENCIES' });

    const deletion = await auth(
      global.api.delete(`/api/seniors/delete-senior/${senior.id}`),
      actor.token,
    );

    expect(deletion.status).toBe(409);
    expect(await Senior.findByPk(senior.id)).not.toBeNull();
  });

  test('blocks senior and marks active recipient absent', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'BLOCK_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id);

    const occasion = await createOccasionFixture({ month: 11 });

    const recipient = await createRecipientFixture(fixture, senior, occasion);

    const res = await auth(global.api.patch('/api/seniors/block-senior'), actor.token).send({
      id: senior.id,
      causeOfRestriction: 'Integration blocking',
    });

    expect(res.status).toBe(200);

    const blocked = await Senior.findByPk(senior.id, { raw: true });

    expect(blocked.isRestricted).toBe(true);
    expect(blocked.causeOfRestriction).toBe('Integration blocking');

    const updatedRecipient = await Recipient.findByPk(recipient.id, { raw: true });

    expect(updatedRecipient.isAbsent).toBe(true);

    const search = await SeniorSearch.findOne({
      where: { seniorId: senior.id, isRestricted: false },
      raw: true,
    });

    expect(search.content).toContain('blocked');
  });

  test('unblocks senior and restores recipient activity', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'BLOCK_SENIOR', 'UNBLOCK_SENIOR']);

    const fixture = await createBasicFixture(actor);

    const { senior } = await createSeniorThroughApi(actor.token, fixture.home.id);

    const occasion = await createOccasionFixture({ month: 11 });

    const recipient = await createRecipientFixture(fixture, senior, occasion);

    await auth(global.api.patch('/api/seniors/block-senior'), actor.token).send({
      id: senior.id,
      causeOfRestriction: 'Integration blocking',
    });

    const res = await auth(global.api.patch('/api/seniors/unblock-senior'), actor.token).send({
      id: senior.id,
    });

    expect(res.status).toBe(200);

    const restored = await Senior.findByPk(senior.id, { raw: true });

    expect(restored.isRestricted).toBe(false);
    expect(restored.causeOfRestriction).toBeNull();
    expect(restored.dateOfRestriction).toBeNull();

    const updatedRecipient = await Recipient.findByPk(recipient.id, { raw: true });

    expect(updatedRecipient.isAbsent).toBe(false);
  });

  test('returns only eligible potential recipients for birthday occasion', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'ADD_NEW_RECIPIENT']);

    const fixture = await createBasicFixture(actor);

    const candidate = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Candidate',
      birthDate: '1945-11-10',
    });

    const existing = await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'Existing',
      birthDate: '1950-11-20',
    });

    await createSeniorThroughApi(actor.token, fixture.home.id, {
      firstName: 'WrongMonth',
      birthDate: '1950-12-20',
    });

    const occasion = await createOccasionFixture({ month: 11 });

    await createRecipientFixture(fixture, existing.senior, occasion, {
      daySnapshot: 20,
      monthSnapshot: 11,
      yearSnapshot: 1950,
    });

    const res = await auth(
      global.api.get(`/api/seniors/get-seniors-for-occasion/${occasion.id}/${fixture.home.id}`),
      actor.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(candidate.senior.id);
    expect(res.body.data[0].fullData).toContain('Candidate');
  });
});
