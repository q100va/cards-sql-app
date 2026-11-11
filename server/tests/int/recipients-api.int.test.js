import jwt from 'jsonwebtoken';

import { Occasion, Order, OrderRecipient, Recipient } from '../../models/index.js';

import {
  ORDER_RECIPIENT_STATUS,
  ORDER_SOURCE,
  ORDER_STATUS,
} from '../../../shared/dist/constants/orders.js';

import { hashPassword } from '../../security/passwords.mjs';

import { createRoleWithOperations } from './factories/role.js';

import { createLocation } from './factories/toponym.js';
import { createHomeFixture } from './factories/home.js';
import { createSenior } from './factories/senior.js';
import { createOccasion } from './factories/occasion.js';
import { createVolunteerWithContact } from './factories/volunteer.js';
import { createUserInstance } from './factories/user.js';

const PASSWORD = 'Password123';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'recipients-integration-user', role: 'RECIPIENTS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedActor(operationNames = []) {
  const role = await createRoleWithOperations(new Set(operationNames), {
    name: 'Recipients Test Role',
  });

  return { role, token: makeAccessToken(role.id) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

const LOCATION = {
  country: { id: 143, name: 'Russia', shortName: 'RU', isRestricted: false },
  region: { name: 'Recipient Test Region', shortName: 'RTR', isRestricted: false },
  district: {
    name: 'Recipient Test District',
    shortName: 'RTD',
    postName: 'Recipient Test District',
    shortPostName: 'RTD',
    isRestricted: false,
  },
  locality: {
    name: 'Recipient Test Locality',
    shortName: 'RTL',
    isFederalCity: false,
    isCapitalOfRegion: false,
    isCapitalOfDistrict: false,
    isRestricted: false,
  },
};

const HOME_FIXTURE = {
  home: {
    homeName: 'Recipient Test Home',
    officialName: 'Recipient Test Home Official',
    noAddress: false,
    specialHome: false,
    acceptableForSchool: true,
    isRestricted: false,
    isClose: false,
  },
  address: {
    postalCode: '123456',
    postalAddressPart: '10 Test Street',
    fullPostalAddress: '123456, Recipient Test Region, 10 Test Street',
    isRestricted: false,
    isRecoverable: true,
  },
};

const SENIOR_FIXTURE = {
  firstName: 'Alice',
  patronymic: null,
  lastName: 'Senior',
  birthDate: '1940-11-15',
  gender: 'female',
  personalNoAddr: false,
  isRestricted: false,
  dateOfExit: null,
};

const OCCASION = { type: 1, month: 11, year: 2027, status: 1, amount: 0 };

async function createBasicFixture(actor, { seniorCount = 2 } = {}) {
  const location = await createLocation(LOCATION);

  const { home } = await createHomeFixture(location, HOME_FIXTURE);

  const occasion = await createOccasion(OCCASION);

  const seniors = [];

  if (seniorCount >= 1) {
    seniors.push(
      await createSenior({
        ...SENIOR_FIXTURE,
        homeId: home.id,
        firstName: 'Alice',
        lastName: 'Senior',
        birthDate: '1940-11-15',
        gender: 'female',
      }),
    );
  }

  if (seniorCount >= 2) {
    seniors.push(
      await createSenior({
        ...SENIOR_FIXTURE,
        homeId: home.id,
        firstName: 'Bob',
        lastName: 'Recipient',
        birthDate: '1950-11-20',
        gender: 'male',
      }),
    );
  }

  return { actor, location, home, occasion, seniors };
}

async function createList(fixture) {
  const res = await auth(global.api.post('/api/recipients/create-list'), fixture.actor.token).send({
    occasionId: fixture.occasion.id,
  });

  expect(res.status).toBe(200);

  return res;
}

function recipientsQuery(occasionId, overrides = {}) {
  return {
    occasionId,
    offset: 0,
    limit: 20,
    sortField: 'fullName',
    sortOrder: 1,
    searchValue: '',
    filters: {},
    ...overrides,
  };
}

async function createDependencyOrder(fixture, recipient = null) {
  const user = await createUserInstance({
    userName: 'recipients_order_user',
    password: await hashPassword(PASSWORD),
    firstName: 'Recipient',
    lastName: 'Order User',
    roleId: fixture.actor.role.id,
    isRestricted: false,
  });

  const { volunteer, contact } = await createVolunteerWithContact(
    { firstName: 'Dependency', lastName: 'Volunteer', isRestricted: false },
    { type: 'email', content: 'recipient.order@example.com', isRestricted: false },
  );

  const order = await Order.create({
    occasionId: fixture.occasion.id,
    volunteerId: volunteer.id,
    userId: user.id,
    instituteId: null,
    contactId: contact.id,
    amount: recipient ? 1 : 0,
    status: ORDER_STATUS.PENDING,
    source: ORDER_SOURCE.WEBSITE,
    comment: null,
  });

  if (recipient) {
    await OrderRecipient.create({
      orderId: order.id,
      recipientId: recipient.id,
      seniorId: recipient.seniorId,
      homeId: recipient.homeIdSnapshot,
      recipientStatus: ORDER_RECIPIENT_STATUS.PRESENT,
    });
  }

  return order;
}

describe('recipients API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api.post('/api/recipients/create-list').send({ occasionId: 1 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks permission', async () => {
    const actor = await createAuthorizedActor();

    const res = await auth(global.api.post('/api/recipients/create-list'), actor.token).send({
      occasionId: 1,
    });

    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid create-list payload', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST']);

    const res = await auth(global.api.post('/api/recipients/create-list'), actor.token).send({
      occasionId: 0,
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('creates recipient list from matching seniors and updates occasion amount', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST']);

    const fixture = await createBasicFixture(actor);

    await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'December',
      lastName: 'Senior',
      birthDate: '1945-12-10',
    });

    const res = await createList(fixture);

    expect(res.body).toEqual({ code: 'SUCCESS.DATA_ADDED', data: 2 });

    const recipients = await Recipient.findAll({
      where: { occasionId: fixture.occasion.id },
      order: [['id', 'ASC']],
      raw: true,
    });

    expect(recipients).toHaveLength(2);
    expect(recipients.map((recipient) => recipient.seniorId)).toEqual(
      expect.arrayContaining(fixture.seniors.map((senior) => senior.id)),
    );

    for (const recipient of recipients) {
      expect(recipient.homeIdSnapshot).toBe(fixture.home.id);
      expect(recipient.regionIdSnapshot).toBe(fixture.location.region.id);
      expect(recipient.isAbsent).toBe(false);
      expect(recipient.plusAmount).toBe(0);
    }

    const occasion = await Occasion.findByPk(fixture.occasion.id, { raw: true });

    expect(occasion.amount).toBe(2);
  });

  test('does not create the same occasion list twice', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST']);

    const fixture = await createBasicFixture(actor, { seniorCount: 1 });

    await createList(fixture);

    const second = await auth(global.api.post('/api/recipients/create-list'), actor.token).send({
      occasionId: fixture.occasion.id,
    });

    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: 'ERRORS.RECIPIENT.LIST_ALREADY_EXISTS' });
    expect(await Recipient.count({ where: { occasionId: fixture.occasion.id } })).toBe(1);
  });

  test('creates recipients only for requested senior ids and increments amount', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_RECIPIENT']);

    const fixture = await createBasicFixture(actor);

    const res = await auth(global.api.post('/api/recipients/create-recipients'), actor.token).send({
      seniorsIds: [fixture.seniors[0].id],
      occasionId: fixture.occasion.id,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.DATA_ADDED', data: 1 });

    const recipients = await Recipient.findAll({
      where: { occasionId: fixture.occasion.id },
      raw: true,
    });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].seniorId).toBe(fixture.seniors[0].id);

    const occasion = await Occasion.findByPk(fixture.occasion.id, { raw: true });

    expect(occasion.amount).toBe(1);
  });

  test('returns recipients with pagination and transformed data', async () => {
    const actor = await createAuthorizedActor([
      'CREATE_RECIPIENTS_LIST',
      'VIEW_LIMITED_RECIPIENTS_LIST',
    ]);

    const fixture = await createBasicFixture(actor);

    await createList(fixture);

    const res = await auth(global.api.post('/api/recipients/get-recipients'), actor.token).send(
      recipientsQuery(fixture.occasion.id),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.list[0]).toMatchObject({
      id: expect.any(Number),
      fullName: expect.any(String),
      birthMonth: 11,
      homeName: fixture.home.homeName,
      regionName: fixture.location.region.name,
      plusAmount: 0,
      isAbsent: false,
    });
  });

  test('searches recipients by snapshot data', async () => {
    const actor = await createAuthorizedActor([
      'CREATE_RECIPIENTS_LIST',
      'VIEW_LIMITED_RECIPIENTS_LIST',
    ]);

    const fixture = await createBasicFixture(actor);

    await createList(fixture);

    const res = await auth(global.api.post('/api/recipients/get-recipients'), actor.token).send(
      recipientsQuery(fixture.occasion.id, { searchValue: 'Alice' }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].fullName).toContain('Alice');
  });

  test('filters recipients by birth year', async () => {
    const actor = await createAuthorizedActor([
      'CREATE_RECIPIENTS_LIST',
      'VIEW_LIMITED_RECIPIENTS_LIST',
    ]);

    const fixture = await createBasicFixture(actor);

    await createList(fixture);

    const res = await auth(global.api.post('/api/recipients/get-recipients'), actor.token).send(
      recipientsQuery(fixture.occasion.id, {
        filters: { birthYear: [{ value: 1940, matchMode: 'equals', operator: 'and' }] },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].birthYear).toBe(1940);
  });

  test('deletes selected recipients and decrements occasion amount', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST', 'DELETE_RECIPIENT']);

    const fixture = await createBasicFixture(actor);

    await createList(fixture);

    const recipients = await Recipient.findAll({
      where: { occasionId: fixture.occasion.id },
      order: [['id', 'ASC']],
    });

    const deleting = recipients[0];

    const res = await auth(
      global.api.delete('/api/recipients/delete-recipients'),
      actor.token,
    ).send({ recipientIds: [deleting.id], occasionId: fixture.occasion.id });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.DATA_DELETED', data: null });
    expect(await Recipient.findByPk(deleting.id)).toBeNull();
    expect(await Recipient.count({ where: { occasionId: fixture.occasion.id } })).toBe(1);

    const occasion = await Occasion.findByPk(fixture.occasion.id, { raw: true });

    expect(occasion.amount).toBe(1);
  });

  test('does not delete a recipient used in an order', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST', 'DELETE_RECIPIENT']);

    const fixture = await createBasicFixture(actor, { seniorCount: 1 });

    await createList(fixture);

    const recipient = await Recipient.findOne({ where: { occasionId: fixture.occasion.id } });

    await createDependencyOrder(fixture, recipient);

    const res = await auth(
      global.api.delete('/api/recipients/delete-recipients'),
      actor.token,
    ).send({ recipientIds: [recipient.id], occasionId: fixture.occasion.id });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'ERRORS.RECIPIENT.HAS_DEPENDENCIES' });
    expect(await Recipient.findByPk(recipient.id)).not.toBeNull();
  });

  test('clears the whole recipient list and resets occasion amount', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST', 'CLEAR_RECIPIENTS_LIST']);

    const fixture = await createBasicFixture(actor);

    await createList(fixture);

    const res = await auth(global.api.patch('/api/recipients/clear-list'), actor.token).send({
      occasionId: fixture.occasion.id,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.DATA_DELETED', data: null });
    expect(await Recipient.count({ where: { occasionId: fixture.occasion.id } })).toBe(0);

    const occasion = await Occasion.findByPk(fixture.occasion.id, { raw: true });

    expect(occasion.amount).toBe(0);
  });

  test('does not clear a recipient list used by an order', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST', 'CLEAR_RECIPIENTS_LIST']);

    const fixture = await createBasicFixture(actor, { seniorCount: 1 });

    await createList(fixture);

    const recipient = await Recipient.findOne({ where: { occasionId: fixture.occasion.id } });

    await createDependencyOrder(fixture, recipient);

    const res = await auth(global.api.patch('/api/recipients/clear-list'), actor.token).send({
      occasionId: fixture.occasion.id,
    });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'ERRORS.RECIPIENT.LIST_HAS_DEPENDENCIES' });
    expect(await Recipient.count({ where: { occasionId: fixture.occasion.id } })).toBe(1);
  });

  test('check-list adds new recipients and marks departed seniors absent', async () => {
    const actor = await createAuthorizedActor(['CREATE_RECIPIENTS_LIST', 'EDIT_RECIPIENTS_LIST']);

    const fixture = await createBasicFixture(actor, { seniorCount: 1 });

    await createList(fixture);

    const oldRecipient = await Recipient.findOne({
      where: { occasionId: fixture.occasion.id, seniorId: fixture.seniors[0].id },
    });

    await fixture.seniors[0].update({ dateOfExit: new Date('2026-11-01') });

    const newSenior = await createSenior({
      ...SENIOR_FIXTURE,
      homeId: fixture.home.id,
      firstName: 'New',
      lastName: 'Senior',
      birthDate: '1960-11-25',
      gender: 'female',
    });

    const res = await auth(global.api.patch('/api/recipients/check-list'), actor.token).send({
      occasionId: fixture.occasion.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SUCCESS.DATA_CHECKED');
    expect(res.body.data.added).toHaveLength(1);
    expect(res.body.data.absent).toHaveLength(1);

    const departed = await Recipient.findByPk(oldRecipient.id, { raw: true });

    expect(departed.isAbsent).toBe(true);

    const added = await Recipient.findOne({
      where: { occasionId: fixture.occasion.id, seniorId: newSenior.id },
      raw: true,
    });

    expect(added).not.toBeNull();
    expect(added.isAbsent).toBe(false);

    const occasion = await Occasion.findByPk(fixture.occasion.id, { raw: true });

    expect(occasion.amount).toBe(2);
  });
});
