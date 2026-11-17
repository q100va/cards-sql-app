import jwt from 'jsonwebtoken';

import { Order, OrderRecipient, Recipient } from '../../models/index.js';

import {
  GENDER_FILTER,
  ORDER_RECIPIENT_STATUS,
  ORDER_SOURCE,
  ORDER_STATUS,
} from '../../../shared/dist/constants/orders.js';

import { hashPassword } from '../../security/passwords.mjs';

import { createRoleWithOperations } from './factories/role.js';

import { createLocation } from './factories/toponym.js';
import { createHomeFixture } from './factories/home.js';
import { createSenior } from './factories/senior.js';
import { createRecipient as createRecipientRow } from './factories/recipient.js';
import { createOccasion } from './factories/occasion.js';
import { createVolunteerWithContact } from './factories/volunteer.js';
import { createUserInstance } from './factories/user.js';

const PASSWORD = 'Password123';

function makeAccessToken(user, role) {
  return jwt.sign(
    { sub: String(user.id), roleId: role.id, uname: user.userName, role: role.name },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedActor(operationNames = []) {
  const role = await createRoleWithOperations(new Set(operationNames), {
    name: 'Orders Test Role',
  });

  const user = await createUserInstance({
    userName: 'orders_test_user',
    password: await hashPassword(PASSWORD),
    firstName: 'Order',
    lastName: 'Tester',
    roleId: role.id,
    isRestricted: false,
  });

  return { role, user, token: makeAccessToken(user, role) };
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

const LOCATION = {
  country: { id: 143, name: 'Russia', shortName: 'RU', isRestricted: false },
  region: { name: 'Integration Region', shortName: 'IR', isRestricted: false },
  district: {
    name: 'Integration District',
    shortName: 'ID',
    postName: 'Integration District',
    shortPostName: 'ID',
    isRestricted: false,
  },
  locality: {
    name: 'Integration Locality',
    shortName: 'IL',
    isFederalCity: false,
    isCapitalOfRegion: false,
    isCapitalOfDistrict: false,
    isRestricted: false,
  },
};

const HOME_FIXTURE = {
  home: {
    homeName: 'Order Test Home',
    officialName: 'Order Test Home Official',
    noAddress: false,
    specialHome: false,
    acceptableForSchool: true,
    isRestricted: false,
    isClose: false,
  },
  address: {
    postalName: 'Order Test Home',
    postalCode: '123456',
    postalAddressPart: '10 Test Street',
    fullPostalAddress: '123456, Integration Region, 10 Test Street',
    isRestricted: false,
    isRecoverable: true,
  },
};

const OCCASION = { type: 1, month: 11, year: 2027, status: 1, amount: 0 };

async function createRecipient({ home, fullPostalAddress, regionId, occasionId, index }) {
  const female = index === 0;

  const senior = await createSenior({
    firstName: female ? 'Anna' : 'John',
    lastName: female ? 'Senior' : 'Recipient',
    birthDate: female ? '1940-11-15' : '2000-11-15',
    gender: female ? 'female' : 'male',
    personalNoAddr: false,
    homeId: home.id,
    isRestricted: false,
    dateOfExit: null,
  });

  const recipient = await createRecipientRow({
    fullNameSnapshot: female ? 'Anna Senior' : 'John Recipient',
    daySnapshot: 15,
    monthSnapshot: 11,
    yearSnapshot: female ? 1940 : 2000,
    regionIdSnapshot: regionId,
    homeIdSnapshot: home.id,
    addressSnapshot: fullPostalAddress,
    category: female ? 'gen_old_female' : 'gen_young_male',
    specialComment: '',
    acceptableForSchool: true,
    isAbsent: false,
    plusAmount: 0,
    seniorId: senior.id,
    occasionId,
  });

  return { senior, recipient };
}

async function createFixture(actor, recipientCount = 2) {
  const location = await createLocation(LOCATION);

  const { home, fullPostalAddress } = await createHomeFixture(location, HOME_FIXTURE);

  const { volunteer, contact } = await createVolunteerWithContact(
    { firstName: 'Integration', lastName: 'Volunteer', isRestricted: false },
    { type: 'email', content: 'orders.volunteer@example.com', isRestricted: false },
  );

  const occasion = await createOccasion(OCCASION);

  const recipients = [];

  for (let index = 0; index < recipientCount; index++) {
    recipients.push(
      await createRecipient({
        home,
        fullPostalAddress,
        regionId: location.region.id,
        occasionId: occasion.id,
        index,
      }),
    );
  }

  return { actor, location, home, volunteer, contact, occasion, recipients };
}

function createOrderPayload(fixture, amount = fixture.recipients.length) {
  const filters = {
    date1: 15,
    date2: 15,
    regions: [fixture.location.region.id],
    homes: [fixture.home.id],
  };

  if (amount === 1) {
    filters.gender = GENDER_FILTER.FEMALE;
  }

  if (amount === 2) {
    filters.gender = GENDER_FILTER.PROPORTION;

    filters.maleAmount = 1;
    filters.femaleAmount = 1;
  }

  return {
    orderDraft: {
      occasionId: fixture.occasion.id,
      volunteerId: fixture.volunteer.id,
      userId: fixture.actor.user.id,
      instituteId: null,
      status: ORDER_STATUS.PENDING,
      source: ORDER_SOURCE.WEBSITE,
      forSchoolDepartment: false,
      contactId: fixture.contact.id,
      amount,
      comment: null,
    },
    filters,
  };
}

async function createOrderThroughApi(fixture, amount = fixture.recipients.length) {
  const res = await auth(global.api.post('/api/orders/create-order'), fixture.actor.token).send(
    createOrderPayload(fixture, amount),
  );

  expect(res.status).toBe(200);

  return res;
}

describe('orders API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api
      .get('/api/orders/check-order')
      .query({ volunteerId: 1, occasionId: 1 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks permission', async () => {
    const actor = await createAuthorizedActor();

    const res = await auth(global.api.post('/api/orders/create-order'), actor.token).send({});

    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid create-order data', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER']);

    const res = await auth(global.api.post('/api/orders/create-order'), actor.token).send({
      orderDraft: {},
      filters: {},
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('returns active regions and homes for order filters', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER']);

    const fixture = await createFixture(actor, 1);

    const res = await auth(global.api.get('/api/orders/get-filters-data'), actor.token);

    expect(res.status).toBe(200);
    expect(res.body.data.regions).toEqual([
      { id: fixture.location.region.id, name: 'Integration Region' },
    ]);
    expect(res.body.data.homes).toEqual([
      { id: fixture.home.id, name: 'Order Test Home', regionId: fixture.location.region.id },
    ]);
  });

  test('creates an order with recipients and increments plusAmount', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER']);

    const fixture = await createFixture(actor, 2);

    const res = await createOrderThroughApi(fixture, 2);

    expect(res.body.data.contact).toBe('orders.volunteer@example.com');

    const order = await Order.findOne();

    expect(order).not.toBeNull();
    expect(order.amount).toBe(2);
    expect(order.status).toBe(ORDER_STATUS.PENDING);

    const orderRecipients = await OrderRecipient.findAll({
      where: { orderId: order.id },
      raw: true,
    });

    expect(orderRecipients).toHaveLength(2);

    for (const { recipient } of fixture.recipients) {
      const stored = await Recipient.findByPk(recipient.id, { raw: true });

      expect(stored.plusAmount).toBe(1);
    }
  });

  test('returns existing orders for the same volunteer and occasion', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER']);

    const fixture = await createFixture(actor, 1);

    await createOrderThroughApi(fixture, 1);

    const res = await auth(global.api.get('/api/orders/check-order'), actor.token).query({
      volunteerId: fixture.volunteer.id,
      occasionId: fixture.occasion.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ userName: actor.user.userName, amount: 1 });
  });

  test('does not create an order when there are not enough recipients', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER']);

    const fixture = await createFixture(actor, 1);

    const res = await createOrderThroughApi(fixture, 2);

    expect(res.body.data).toEqual({ contact: 'orders.volunteer@example.com', recipients: [] });
    expect(await Order.count()).toBe(0);

    const recipient = await Recipient.findByPk(fixture.recipients[0].recipient.id, { raw: true });

    expect(recipient.plusAmount).toBe(0);
  });

  test('returns orders with total count and filter options', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER', 'VIEW_LIMITED_ORDERS_LIST']);

    const fixture = await createFixture(actor, 1);

    await createOrderThroughApi(fixture, 1);

    const res = await auth(global.api.post('/api/orders/get-orders'), actor.token).send({
      offset: 0,
      limit: 10,
      sortField: null,
      sortOrder: null,
      filters: {},
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0]).toMatchObject({
      id: expect.any(Number),
      amount: 1,
      userName: actor.user.userName,
    });
    expect(res.body.data.options.users).toEqual(
      expect.arrayContaining([{ id: actor.user.id, userName: actor.user.userName }]),
    );
    expect(res.body.data.options.statuses.length).toBeGreaterThan(0);
    expect(res.body.data.options.sources.length).toBeGreaterThan(0);
    expect(res.body.data.options.nodes.length).toBeGreaterThan(0);
  });

  test('returns full order details by id', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER', 'VIEW_ORDER']);

    const fixture = await createFixture(actor, 1);

    await createOrderThroughApi(fixture, 1);

    const order = await Order.findOne();

    const res = await auth(global.api.get(`/api/orders/order/${order.id}`), actor.token);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: order.id, amount: 1, userName: actor.user.userName });
    expect(res.body.data.recipients).toBeDefined();
  });

  test('updates status and adjusts recipient plusAmount in both directions', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER', 'EDIT_ORDER']);

    const fixture = await createFixture(actor, 1);

    await createOrderThroughApi(fixture, 1);

    const order = await Order.findOne();

    const recipientId = fixture.recipients[0].recipient.id;

    let recipient = await Recipient.findByPk(recipientId, { raw: true });

    expect(recipient.plusAmount).toBe(1);

    const returned = await auth(global.api.patch('/api/orders/update-status'), actor.token).send({
      id: order.id,
      status: ORDER_STATUS.RETURNED,
    });

    expect(returned.status).toBe(200);

    recipient = await Recipient.findByPk(recipientId, { raw: true });

    expect(recipient.plusAmount).toBe(0);

    const accepted = await auth(global.api.patch('/api/orders/update-status'), actor.token).send({
      id: order.id,
      status: ORDER_STATUS.ACCEPTED,
    });

    expect(accepted.status).toBe(200);

    recipient = await Recipient.findByPk(recipientId, { raw: true });

    expect(recipient.plusAmount).toBe(1);

    const storedOrder = await Order.findByPk(order.id, { raw: true });

    expect(storedOrder.status).toBe(ORDER_STATUS.ACCEPTED);
  });

  test('removes one recipient from an order and adjusts amount and plusAmount', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER', 'EDIT_ORDER']);

    const fixture = await createFixture(actor, 2);

    await createOrderThroughApi(fixture, 2);

    const order = await Order.findOne();

    const orderRecipients = await OrderRecipient.findAll({
      where: { orderId: order.id },
      order: [['id', 'ASC']],
    });

    const deleting = orderRecipients[0];

    const kept = orderRecipients[1];

    const res = await auth(global.api.patch('/api/orders/edit-recipients'), actor.token).send({
      id: order.id,
      deletingIds: [deleting.id],
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SUCCESS.UPDATED');

    const updatedOrder = await Order.findByPk(order.id, { raw: true });

    expect(updatedOrder.amount).toBe(1);

    const deletedRow = await OrderRecipient.findByPk(deleting.id, { raw: true });

    expect(deletedRow.recipientStatus).toBe(ORDER_RECIPIENT_STATUS.DELETED);

    const deletedRecipient = await Recipient.findByPk(deleting.recipientId, { raw: true });

    const keptRecipient = await Recipient.findByPk(kept.recipientId, { raw: true });

    expect(deletedRecipient.plusAmount).toBe(0);
    expect(keptRecipient.plusAmount).toBe(1);
  });

  test('does not allow deleting the last recipient from an order', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER', 'EDIT_ORDER']);

    const fixture = await createFixture(actor, 1);

    await createOrderThroughApi(fixture, 1);

    const order = await Order.findOne();

    const orderRecipient = await OrderRecipient.findOne({ where: { orderId: order.id } });

    const res = await auth(global.api.patch('/api/orders/edit-recipients'), actor.token).send({
      id: order.id,
      deletingIds: [orderRecipient.id],
    });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'ERRORS.ORDER.MIN_RECIPIENTS' });

    const storedOrder = await Order.findByPk(order.id, { raw: true });

    expect(storedOrder.amount).toBe(1);

    const recipient = await Recipient.findByPk(orderRecipient.recipientId, { raw: true });

    expect(recipient.plusAmount).toBe(1);
  });

  test('deletes a pending order and releases its recipients', async () => {
    const actor = await createAuthorizedActor(['ADD_NEW_ORDER', 'DELETE_ORDER']);

    const fixture = await createFixture(actor, 2);

    await createOrderThroughApi(fixture, 2);

    const order = await Order.findOne();

    const recipientIds = fixture.recipients.map(({ recipient }) => recipient.id);

    const deletion = await auth(
      global.api.delete(`/api/orders/delete-order/${order.id}`),
      actor.token,
    );

    expect(deletion.status).toBe(200);
    expect(deletion.body).toEqual({ code: 'SUCCESS.DELETED', data: null });
    expect(await Order.findByPk(order.id)).toBeNull();

    for (const id of recipientIds) {
      const recipient = await Recipient.findByPk(id, { raw: true });

      expect(recipient.plusAmount).toBe(0);
    }
  });
});
