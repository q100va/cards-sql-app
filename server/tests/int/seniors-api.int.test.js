import jwt from 'jsonwebtoken';

import { HomeUpdateDate, Recipient, Senior, SeniorSearch } from '../../models/index.js';

import { OCCASION_STATUS } from '../../../shared/dist/constants/occasions.js';

import { createRoleWithOperations } from './factories/role.js';

import { createLocation } from './factories/toponym.js';
import { createHome, createHomeFixture } from './factories/home.js';
import { createRecipient as createRecipientRow } from './factories/recipient.js';
import { createOccasion } from './factories/occasion.js';
import { createUserInstance } from './factories/user.js';

function makeAccessToken(roleId, userId = 42) {
  return jwt.sign(
    { sub: String(userId), roleId, uname: 'seniors-integration-user', role: 'SENIORS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedActor(operationNames = []) {
  const role = await createRoleWithOperations(new Set(operationNames), {
    name: 'Seniors Test Role',
  });

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

const LOCATION = {
  country: { id: 143, name: 'Russia', shortName: 'RU', isRestricted: false },
  region: { name: 'Senior Test Region', shortName: 'STR', isRestricted: false },
  district: {
    name: 'Senior Test District',
    shortName: 'STD',
    postName: 'Senior Test District',
    shortPostName: 'STD',
    isRestricted: false,
  },
  locality: {
    name: 'Senior Test Locality',
    shortName: 'STL',
    isFederalCity: false,
    isCapitalOfRegion: false,
    isCapitalOfDistrict: false,
    isRestricted: false,
  },
};

const HOME_FIXTURE = {
  home: {
    homeName: 'Senior Test Home',
    officialName: 'Senior Test Home Official',
    noAddress: false,
    specialHome: false,
    acceptableForSchool: true,
    isRestricted: false,
    isClose: false,
  },
  address: {
    postalCode: '123456',
    postalAddressPart: '10 Senior Street',
    fullPostalAddress: '123456, Senior Test Region, 10 Senior Street',
    isRestricted: false,
    isRecoverable: true,
  },
};

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

const OCCASION = { type: 1, month: 11, year: 2027, status: OCCASION_STATUS.OPEN, amount: 0 };

async function createRecipientFixture(fixture, senior, occasion, overrides = {}) {
  return createRecipientRow({
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
  const location = await createLocation(LOCATION);

  const { home, address } = await createHomeFixture(location, HOME_FIXTURE);

  return { actor, location, home, address };
}

const bulkUpdateDate = '2026-11-21T12:00:00.000Z';

async function createBulkFixture() {
  const actor = await createAuthorizedActor(['ADD_NEW_SENIOR', 'UPLOAD_LIST_OF_SENIORS']);
  const fixture = await createBasicFixture(actor);
  const user = await createUserInstance({ roleId: actor.role.id });
  return { ...fixture, token: makeAccessToken(actor.role.id, user.id) };
}

function saveBulk(fixture, changes) {
  return auth(global.api.post('/api/seniors/update-seniors-list'), fixture.token).send({
    homeId: fixture.home.id,
    dateOfUpdate: bulkUpdateDate,
    admitted: [],
    removed: [],
    updated: [],
    ...changes,
  });
}

describe('seniors API', () => {
  test('rejects a stale bulk edit without recording a completed home update', async () => {
    const actor = await createAuthorizedActor(['UPLOAD_LIST_OF_SENIORS']);
    const { home } = await createBasicFixture(actor);
    const user = await createUserInstance({ roleId: actor.role.id });

    // A row from an earlier comparison no longer exists when the operator saves.
    const response = await auth(
      global.api.post('/api/seniors/update-seniors-list'),
      makeAccessToken(actor.role.id, user.id),
    ).send({
      homeId: home.id,
      dateOfUpdate: '2026-11-21T12:00:00.000Z',
      admitted: [],
      removed: [],
      updated: [{ seniorId: 1, changes: { comment: 'Reviewed' } }],
    });

    const recordedUpdates = await HomeUpdateDate.count({ where: { homeId: home.id } });
    expect({ staleConflict: [404, 409].includes(response.status), recordedUpdates }).toEqual({
      staleConflict: true,
      recordedUpdates: 0,
    });
  });

  test('rejects a bulk removal when the compared Senior has since been deleted', async () => {
    const fixture = await createBulkFixture();
    const { senior, payload } = await createSeniorThroughApi(fixture.token, fixture.home.id);
    const comparison = await auth(
      global.api.post('/api/seniors/compare-seniors-lists'),
      fixture.token,
    ).send({
      newList: [],
      homeName: fixture.home.homeName,
      commentsMode: false,
      chosenMonths: [],
    });
    expect(comparison.status).toBe(200);
    const [removed] = comparison.body.data.differences.removedSeniors;
    expect(removed.id).toBe(senior.id);
    await senior.destroy();

    const response = await saveBulk(fixture, {
      admitted: [{ ...payload, id: undefined, firstName: 'New resident' }],
      removed: [removed],
    });

    expect(response.status).toBe(409);
    expect(await Senior.count()).toBe(0);
    expect(await HomeUpdateDate.count()).toBe(0);
  });

  test.each(['updated', 'removed'])('rejects foreign-Home Seniors in bulk %s', async (section) => {
    const fixture = await createBulkFixture();
    const foreignHome = await createHome({ homeName: 'Other home' });
    const { senior, payload } = await createSeniorThroughApi(fixture.token, foreignHome.id);
    const row = section === 'updated'
      ? { seniorId: senior.id, changes: { firstName: 'Changed' } }
      : { ...payload, id: senior.id, homeId: fixture.home.id };

    const response = await saveBulk(fixture, { [section]: [row] });

    expect(response.status).toBe(409);
    await senior.reload();
    expect(senior.firstName).toBe(payload.firstName);
    expect(senior.dateOfExit).toBeNull();
    expect(await HomeUpdateDate.count()).toBe(0);
  });

  test('rejects a bulk admission for a different Home', async () => {
    const fixture = await createBulkFixture();
    const foreignHome = await createHome({ homeName: 'Other home' });
    const response = await saveBulk(fixture, {
      admitted: [{ ...seniorDraft(foreignHome.id), id: undefined }],
    });

    expect(response.status).toBe(409);
    expect(await Senior.count()).toBe(0);
    expect(await HomeUpdateDate.count()).toBe(0);
  });

  test('rolls back earlier bulk writes when a later Senior update fails in PostgreSQL', async () => {
    const fixture = await createBulkFixture();
    const { senior: first } = await createSeniorThroughApi(fixture.token, fixture.home.id);
    const { senior: second } = await createSeniorThroughApi(fixture.token, fixture.home.id, {
      firstName: 'Second',
    });
    const response = await saveBulk(fixture, {
      admitted: [{ ...seniorDraft(fixture.home.id, { firstName: 'Admitted' }), id: undefined }],
      updated: [
        { seniorId: first.id, changes: { firstName: 'Changed' } },
        { seniorId: second.id, changes: { firstName: 'x'.repeat(51) } },
      ],
    });

    expect(response.status).toBe(500);
    expect((await first.reload()).firstName).toBe('Alice');
    expect((await second.reload()).firstName).toBe('Second');
    expect(await Senior.count()).toBe(2);
    expect(await SeniorSearch.count()).toBe(2);
    expect(await HomeUpdateDate.count()).toBe(0);
  });

  test('commits a same-Home bulk save with accurate counts and refreshed related state', async () => {
    const fixture = await createBulkFixture();
    const { senior: edited } = await createSeniorThroughApi(fixture.token, fixture.home.id);
    const { senior: removed, payload } = await createSeniorThroughApi(fixture.token, fixture.home.id, {
      firstName: 'Leaving',
    });
    const occasion = await createOccasion(OCCASION);
    const editedRecipient = await createRecipientFixture(fixture, edited, occasion);
    const removedRecipient = await createRecipientFixture(fixture, removed, occasion);
    const response = await saveBulk(fixture, {
      admitted: [{ ...seniorDraft(fixture.home.id, { firstName: 'Admitted' }), id: undefined }],
      removed: [{ ...payload, id: removed.id }],
      updated: [{ seniorId: edited.id, changes: { firstName: 'Changed' } }],
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code: 'SUCCESS.UPDATED',
      data: { createdCount: 1, removedCount: 1, updatedCount: 1 },
    });
    expect((await edited.reload()).firstName).toBe('Changed');
    expect((await removed.reload()).dateOfExit.toISOString()).toBe(bulkUpdateDate);
    const admitted = await Senior.findOne({ where: { homeId: fixture.home.id, firstName: 'Admitted' } });
    expect(admitted).not.toBeNull();
    expect((await SeniorSearch.findOne({ where: { seniorId: edited.id } })).content).toMatch(/changed/i);
    expect(await SeniorSearch.count({ where: { seniorId: admitted.id } })).toBe(1);
    expect((await editedRecipient.reload()).fullNameSnapshot).toContain('Changed');
    expect((await removedRecipient.reload()).isAbsent).toBe(true);
    expect(await Recipient.count({ where: { seniorId: admitted.id, occasionId: occasion.id } })).toBe(1);
    const markers = await HomeUpdateDate.findAll({ where: { homeId: fixture.home.id } });
    expect(markers).toHaveLength(1);
    expect(markers[0].isLatest).toBe(true);
    expect(markers[0].date.toISOString()).toBe(bulkUpdateDate);
  });

  test('keeps the exact stored exit timestamp from bulk comparison and still supports clearing it', async () => {
    const fixture = await createBulkFixture();
    const original = '2026-11-21T21:00:00.000Z';
    const { senior, payload } = await createSeniorThroughApi(fixture.token, fixture.home.id, {
      dateOfExit: original,
    });
    expect((await senior.reload()).dateOfExit.toISOString()).toBe(original);

    const comparison = await auth(
      global.api.post('/api/seniors/compare-seniors-lists'),
      fixture.token,
    ).send({
      newList: [{
        ...payload,
        nursingHome: fixture.home.homeName,
        dayBirthday: 15,
        monthBirthday: 11,
        yearBirthday: 1940,
      }],
      homeName: fixture.home.homeName,
      commentsMode: true,
      chosenMonths: [],
    });
    expect(comparison.status).toBe(200);
    const [returning] = comparison.body.data.differences.returnedSeniors;
    expect(returning.oldSenior.id).toBe(senior.id);
    const exitChange = returning.changeRows.find(({ field }) => field === 'dateOfExit');
    expect(exitChange).toMatchObject({ oldValue: original, newValue: null });

    const keep = await saveBulk(fixture, {
      updated: [{ seniorId: senior.id, changes: { dateOfExit: exitChange.oldValue } }],
    });
    expect(keep.status).toBe(200);
    expect(keep.body.data).toEqual({ createdCount: 0, removedCount: 0, updatedCount: 1 });
    const persisted = (await senior.reload()).dateOfExit;
    expect(persisted.toISOString()).toBe(original);
    const calendarDay = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    expect(calendarDay.format(new Date(original))).toBe('22/11/2026');
    expect(calendarDay.format(persisted)).toBe('22/11/2026');

    const clear = await saveBulk(fixture, {
      updated: [{ seniorId: senior.id, changes: { dateOfExit: exitChange.newValue } }],
    });
    expect(clear.status).toBe(200);
    expect((await senior.reload()).dateOfExit).toBeNull();
    expect(await HomeUpdateDate.count({ where: { homeId: fixture.home.id, isLatest: true } })).toBe(1);
  });

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

    const occasion = await createOccasion(OCCASION);

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

    const occasion = await createOccasion({ ...OCCASION, month: 11 });

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

    const occasion = await createOccasion({ ...OCCASION, month: 11 });

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

    const occasion = await createOccasion({ ...OCCASION, month: 11 });

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
