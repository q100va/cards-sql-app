import jwt from 'jsonwebtoken';

import { Country, Order, Region, VolunteerInstitute, OrderRecipient } from '../../models/index.js';

import { COLUMNS, REPORT_FREQUENCY, REPORT_TYPE } from '../../../shared/dist/constants/reports.js';

import {
  ORDER_RECIPIENT_STATUS,
  ORDER_SOURCE,
  ORDER_STATUS,
} from '../../../shared/dist/constants/orders.js';

import { OCCASION_STATUS } from '../../../shared/dist/constants/occasions.js';

import { INSTITUTE_CATEGORY } from '../../../shared/dist/constants/volunteers.js';

import { hashPassword } from '../../security/passwords.mjs';

import { createRoleWithOperations } from './factories/role.js';

import { createHome } from './factories/home.js';
import { createSenior } from './factories/senior.js';
import { createRecipient as createRecipientRow } from './factories/recipient.js';
import { createOccasion } from './factories/occasion.js';
import { createVolunteerWithContact } from './factories/volunteer.js';
import { createUserInstance } from './factories/user.js';

const PASSWORD = 'Password123';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'reports-integration-user', role: 'REPORTS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedActor(operationNames = []) {
  const role = await createRoleWithOperations(new Set(operationNames), {
    name: 'Reports Test Role',
  });

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

async function createUser(roleId, userName) {
  return createUserInstance({
    userName,
    password: await hashPassword(PASSWORD),
    firstName: 'Report',
    lastName: 'User',
    roleId,
    isRestricted: false,
  });
}

async function createBaseFixture(actor) {
  const country = await Country.create({
    id: 143,
    name: 'Russia',
    shortName: 'RU',
    isRestricted: false,
  });

  const region = await Region.create({
    name: 'Report Test Region',
    shortName: 'RTR',
    countryId: country.id,
    isRestricted: false,
  });

  const home = await createHome({
    homeName: 'Report Test Home',
    officialName: 'Report Test Home Official',
    noAddress: false,
    specialHome: false,
    acceptableForSchool: true,
    comment: null,
    infoNote: null,
    isRestricted: false,
    causeOfRestriction: null,
    dateOfRestriction: null,
    isClose: false,
    dateOfClose: null,
  });

  const senior = await createSenior({
    firstName: 'Report',
    lastName: 'Senior',
    birthDate: '1940-11-15',
    gender: 'female',
    personalNoAddr: false,
    isRestricted: false,
    dateOfExit: null,
    homeId: home.id,
  });

  const { volunteer, contact } = await createVolunteerWithContact(
    { firstName: 'Report', lastName: 'Volunteer', isRestricted: false },
    { type: 'email', content: 'report.volunteer@example.com', isRestricted: false },
  );

  const user = await createUser(actor.role.id, 'report_user_1');

  return { actor, country, region, home, senior, volunteer, contact, user };
}

const SENIOR_FIXTURE = {
  firstName: 'Extra',
  lastName: 'Senior',
  birthDate: '1950-11-20',
  gender: 'female',
  personalNoAddr: false,
  isRestricted: false,
  dateOfExit: null,
};

const OCCASION = { type: 1, month: 11, year: 2026, amount: 0, status: OCCASION_STATUS.OPEN };

async function createInstitute(volunteerId, overrides = {}) {
  return VolunteerInstitute.create({
    volunteerId,
    instituteName: overrides.instituteName ?? 'Report Test School',
    category: overrides.category ?? INSTITUTE_CATEGORY.SCHOOL,
    createdAt: overrides.createdAt ?? new Date('2026-05-05T12:00:00.000Z'),
    updatedAt: overrides.createdAt ?? new Date('2026-05-05T12:00:00.000Z'),
  });
}

async function createRecipient(fixture, occasion, overrides = {}) {
  const senior = overrides.senior ?? fixture.senior;

  return createRecipientRow({
    fullNameSnapshot: overrides.fullNameSnapshot ?? `${senior.lastName} ${senior.firstName}`,
    daySnapshot: overrides.daySnapshot ?? 15,
    monthSnapshot: overrides.monthSnapshot ?? 11,
    yearSnapshot: overrides.yearSnapshot ?? 1940,
    regionIdSnapshot: overrides.regionIdSnapshot ?? fixture.region.id,
    homeIdSnapshot: overrides.homeIdSnapshot ?? fixture.home.id,
    addressSnapshot: overrides.addressSnapshot ?? 'Report Test Address',
    category: overrides.category ?? 'gen_old_female',
    specialComment: overrides.specialComment ?? '',
    acceptableForSchool: overrides.acceptableForSchool ?? true,
    isAbsent: overrides.isAbsent ?? false,
    plusAmount: overrides.plusAmount ?? 0,
    seniorId: senior.id,
    occasionId: occasion.id,
  });
}

async function createOrderFixture(
  fixture,
  {
    occasion,
    recipient,
    user = fixture.user,
    volunteer = fixture.volunteer,
    contact = fixture.contact,
    institute = null,
    status = ORDER_STATUS.PENDING,
    source = ORDER_SOURCE.WEBSITE,
    recipientStatus = ORDER_RECIPIENT_STATUS.PRESENT,
    amount = 1,
    createdAt = new Date('2026-05-15T12:00:00.000Z'),
  },
) {
  const order = await Order.create({
    occasionId: occasion.id,
    volunteerId: volunteer.id,
    userId: user.id,
    instituteId: institute?.id ?? null,
    contactId: contact.id,
    amount,
    status,
    source,
    comment: null,
    createdAt,
    updatedAt: createdAt,
  });

  if (recipient) {
    await OrderRecipient.create({
      orderId: order.id,
      recipientId: recipient.id,
      seniorId: recipient.seniorId,
      homeId: recipient.homeIdSnapshot,
      recipientStatus,
    });
  }

  return order;
}

function reportPayload(type, overrides = {}) {
  return {
    userId: null,
    type,
    frequency: REPORT_FREQUENCY.MONTHLY,
    months: [5],
    quarters: null,
    years: [2026],
    ...overrides,
  };
}

describe('reports API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .post('/api/reports/get-report')
      .send(reportPayload(REPORT_TYPE.GENERAL));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks report permission', async () => {
    const actor = await createAuthorizedActor();

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send(
      reportPayload(REPORT_TYPE.GENERAL),
    );

    expect(res.status).toBe(403);
  });

  test('returns 422 when monthly report has no months', async () => {
    const actor = await createAuthorizedActor(['VIEW_LIMITED_REPORTS']);

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send({
      userId: null,
      type: REPORT_TYPE.GENERAL,
      frequency: REPORT_FREQUENCY.MONTHLY,
      months: null,
      quarters: null,
      years: [2026],
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('builds general monthly report from active orders and active recipients', async () => {
    const actor = await createAuthorizedActor(['VIEW_LIMITED_REPORTS']);

    const fixture = await createBaseFixture(actor);

    const occasion = await createOccasion(OCCASION);

    const institute = await createInstitute(fixture.volunteer.id);

    const activeRecipient = await createRecipient(fixture, occasion);

    await createOrderFixture(fixture, { occasion, recipient: activeRecipient, institute });
    const returnedSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'Returned',
    });

    const returnedRecipient = await createRecipient(fixture, occasion, {
      senior: returnedSenior,
      fullNameSnapshot: 'Returned Senior',
    });;

    await createOrderFixture(fixture, {
      occasion,
      recipient: returnedRecipient,
      institute,
      status: ORDER_STATUS.RETURNED,
    });

    const deletedSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'Deleted',
    });

    const deletedRecipient = await createRecipient(fixture, occasion, {
      senior: deletedSenior,
      fullNameSnapshot: 'Deleted Recipient',
    });

    await createOrderFixture(fixture, {
      occasion,
      recipient: deletedRecipient,
      institute,
      recipientStatus: ORDER_RECIPIENT_STATUS.DELETED,
    });

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send(
      reportPayload(REPORT_TYPE.GENERAL),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe(REPORT_TYPE.GENERAL);
    expect(res.body.data.cols).toEqual(COLUMNS[REPORT_TYPE.GENERAL]);
    expect(res.body.data.report).toHaveLength(1);
    expect(res.body.data.report[0]).toMatchObject({
      key: '2026-5',
      periodData: { year: 2026, month: 5 },
      recipientsCount: 1,
      volunteersCount: 1,
      institutesCount: 1,
      schoolsCount: 1,
      seniorsCount: 1,
      homesCount: 1,
      regionsCount: 1,
    });
    expect(res.body.data.report[0].occasions).toHaveLength(1);
    expect(res.body.data.report[0].occasions[0]).toMatchObject({
      occasionId: occasion.id,
      recipientsCount: 1,
      seniorsCount: 1,
    });
  });

  test('includes only orders inside the selected monthly period', async () => {
    const actor = await createAuthorizedActor(['VIEW_LIMITED_REPORTS']);

    const fixture = await createBaseFixture(actor);

    const occasion = await createOccasion(OCCASION);

    const mayRecipient = await createRecipient(fixture, occasion);

    await createOrderFixture(fixture, {
      occasion,
      recipient: mayRecipient,
      createdAt: new Date('2026-05-15T12:00:00.000Z'),
    });

    const septemberSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'September',
    });

    const septemberRecipient = await createRecipient(fixture, occasion, {
      senior: septemberSenior,
      fullNameSnapshot: 'September Senior',
    });;

    await createOrderFixture(fixture, {
      occasion,
      recipient: septemberRecipient,
      createdAt: new Date('2026-09-15T12:00:00.000Z'),
    });

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send(
      reportPayload(REPORT_TYPE.GENERAL),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.report).toHaveLength(1);
    expect(res.body.data.report[0].recipientsCount).toBe(1);
    expect(res.body.data.report[0].periodData).toEqual({ year: 2026, month: 5 });
  });

  test('builds personal annual report', async () => {
    const actor = await createAuthorizedActor(['VIEW_FULL_REPORTS']);

    const fixture = await createBaseFixture(actor);

    const occasion = await createOccasion(OCCASION);

    const firstRecipient = await createRecipient(fixture, occasion);

    await createOrderFixture(fixture, {
      occasion,
      recipient: firstRecipient,
      createdAt: new Date('2026-02-10T12:00:00.000Z'),
    });

    const secondSenior = await createSenior({
      firstName: 'Second',
      lastName: 'Senior',
      birthDate: '1950-11-20',
      gender: 'male',
      personalNoAddr: false,
      isRestricted: false,
      dateOfExit: null,
      homeId: fixture.home.id,
    });

    const otherSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'Other',
    });

    const secondRecipient = await createRecipient(fixture, occasion, {
      senior: otherSenior,
      fullNameSnapshot: 'Other User Senior',
    });

    await createOrderFixture(fixture, {
      occasion,
      recipient: secondRecipient,
      createdAt: new Date('2026-10-10T12:00:00.000Z'),
    });

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send(
      reportPayload(REPORT_TYPE.PERSONAL, {
        frequency: REPORT_FREQUENCY.ANNUAL,
        months: null,
        quarters: null,
        years: [2026],
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.report).toHaveLength(1);
    expect(res.body.data.report[0]).toMatchObject({
      key: '2026',
      periodData: { year: 2026 },
      ordersCount: 2,
      recipientsCount: 2,
      seniorsCount: 2,
      volunteersCount: 1,
      institutesCount: 0,
    });
  });

  test('filters reports by userId', async () => {
    const actor = await createAuthorizedActor(['VIEW_LIMITED_REPORTS']);

    const fixture = await createBaseFixture(actor);

    const secondUser = await createUser(actor.role.id, 'report_user_2');

    const occasion = await createOccasion(OCCASION);

    const firstRecipient = await createRecipient(fixture, occasion);

    await createOrderFixture(fixture, { occasion, recipient: firstRecipient, user: fixture.user });

    const otherSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'Other',
    });

    const secondRecipient = await createRecipient(fixture, occasion, {
      senior: otherSenior,
      fullNameSnapshot: 'Other User Senior',
    });

    await createOrderFixture(fixture, { occasion, recipient: secondRecipient, user: secondUser });

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send(
      reportPayload(REPORT_TYPE.PERSONAL, { userId: fixture.user.id }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.report).toHaveLength(1);
    expect(res.body.data.report[0].ordersCount).toBe(1);
    expect(res.body.data.report[0].recipientsCount).toBe(1);
  });

  test('builds school coordination report and counts Dobrоru and new school', async () => {
    const actor = await createAuthorizedActor(['VIEW_FULL_REPORTS']);

    const fixture = await createBaseFixture(actor);

    const occasion = await createOccasion(OCCASION);

    const institute = await createInstitute(fixture.volunteer.id, {
      createdAt: new Date('2026-05-05T12:00:00.000Z'),
    });

    const recipient = await createRecipient(fixture, occasion);

    await createOrderFixture(fixture, {
      occasion,
      recipient,
      institute,
      source: ORDER_SOURCE.DOBRORU,
      createdAt: new Date('2026-05-15T12:00:00.000Z'),
    });

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send(
      reportPayload(REPORT_TYPE.SCHOOL_COORDINATION),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.report).toHaveLength(1);
    expect(res.body.data.report[0]).toMatchObject({
      key: '2026-5',
      periodData: { year: 2026, month: 5 },
      ordersCount: 1,
      dobroruCount: 1,
      recipientsCount: 1,
      volunteersCount: 1,
      schoolsCount: 1,
      newSchoolsCount: 1,
    });
  });

  test('builds report by occasion year rather than order creation year', async () => {
    const actor = await createAuthorizedActor(['VIEW_FULL_REPORTS']);

    const fixture = await createBaseFixture(actor);

    const occasion2027 = await createOccasion({ ...OCCASION, year: 2027 });

    const institute = await createInstitute(fixture.volunteer.id);

    const recipient2027 = await createRecipient(fixture, occasion2027);

    await createOrderFixture(fixture, {
      occasion: occasion2027,
      recipient: recipient2027,
      institute,
      createdAt: new Date('2026-05-15T12:00:00.000Z'),
    });

    const occasion2026 = await createOccasion({ ...OCCASION, month: 12, year: 2026 });

    const recipient2026 = await createRecipient(fixture, occasion2026, {
      fullNameSnapshot: '2026 Senior',
    });

    await createOrderFixture(fixture, {
      occasion: occasion2026,
      recipient: recipient2026,
      institute,
    });

    const res = await auth(global.api.post('/api/reports/get-report'), actor.token).send(
      reportPayload(REPORT_TYPE.BY_OCCASION, { years: [2027] }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.report).toHaveLength(1);
    expect(res.body.data.report[0]).toMatchObject({
      key: occasion2027.id,
      ordersCount: 1,
      recipientsCount: 1,
      volunteersCount: 1,
      institutesCount: 1,
      schoolsCount: 1,
      seniorsCount: 1,
      homesCount: 1,
      regionsCount: 1,
    });
  });

  test('returns 403 for current statistic without permission', async () => {
    const actor = await createAuthorizedActor();

    const res = await auth(global.api.get('/api/reports/get-statistic'), actor.token);

    expect(res.status).toBe(403);
  });

  test('returns current statistic only for active recipients of open occasions', async () => {
    const actor = await createAuthorizedActor(['VIEW_CURRENT_STATISTIC']);

    const fixture = await createBaseFixture(actor);

    const openOccasion = await createOccasion({ ...OCCASION, status: OCCASION_STATUS.OPEN });

    const closedOccasion = await createOccasion({
      ...OCCASION,
      month: 12,
      status: OCCASION_STATUS.CLOSED,
    });

    await createRecipient(fixture, openOccasion, { category: 'gen_old_female', plusAmount: 0 });

    const mentalSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'Mental',
    });

    await createRecipient(fixture, openOccasion, {
      senior: mentalSenior,
      fullNameSnapshot: 'Mental Recipient',
      category: 'ment_old_female',
      plusAmount: 1,
    });

    const specialSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'Special',
    });

    await createRecipient(fixture, openOccasion, {
      senior: specialSenior,
      fullNameSnapshot: 'Special Recipient',
      category: 'spec_old_female',
      plusAmount: 4,
    });

    const absentSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'Absent',
    });

    await createRecipient(fixture, openOccasion, {
      senior: absentSenior,
      fullNameSnapshot: 'Absent Recipient',
      category: 'gen_old_female',
      plusAmount: 2,
      isAbsent: true,
    });

    await createRecipient(fixture, closedOccasion, {
      fullNameSnapshot: 'Closed Occasion Recipient',
      category: 'gen_old_female',
      plusAmount: 0,
    });

    const res = await auth(global.api.get('/api/reports/get-statistic'), actor.token);

    expect(res.status).toBe(200);
    expect(res.body.data.cols).toEqual(COLUMNS[REPORT_TYPE.CURRENT_STATISTIC]);
    expect(res.body.data.report).toHaveLength(1);
    expect(res.body.data.report[0]).toMatchObject({
      key: openOccasion.id,
      allRecipients: 3,
      partRecipients: 2,

      zeroAll: 1,
      onceAll: 1,
      twiceAll: 0,
      threeTimesAll: 0,
      fourTimesOrMoreAll: 1,

      zeroPart: 0,
      oncePart: 1,
      twicePart: 0,
      threeTimesPart: 0,
      fourTimesOrMorePart: 1,
    });
  });
});
