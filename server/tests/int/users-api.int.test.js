import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import {
  RefreshToken,
  User,
  UserContact,
  UserSearch,
  VolunteerSubscription,
} from '../../models/index.js';

import { hashPassword, verify } from '../../security/passwords.mjs';

import { createRole, createRoleWithOperations } from './factories/role.js';
import { createOperation } from './factories/operation.js';
import { createVolunteer } from './factories/volunteer.js';
import { createUserInstance } from './factories/user.js';

const PASSWORD = 'Password123';
const NEW_PASSWORD = 'NewPassword456';

let passwordHash;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

function makeAccessToken(roleId, userId = 42) {
  return jwt.sign(
    { sub: String(userId), roleId, uname: 'users-integration-user', role: 'USERS_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedRole(operationNames = [], userId = 42) {
  const role = await createRoleWithOperations(operationNames, { name: 'Users Test Role' });

  return { role, token: makeAccessToken(role.id, userId) };
}

async function createStoredUser({ roleId, userName = 'stored_user', ...overrides } = {}) {
  const user = await createUserInstance({
    userName,
    password: passwordHash,
    firstName: 'John',
    lastName: 'Fox',
    roleId,
    isRestricted: false,
    ...overrides,
  });

  return user.get({ plain: true });
}

async function createRefreshToken(userId) {
  return RefreshToken.create({
    id: randomUUID(),
    userId,
    userAgent: 'users-api-integration-test',
    ip: '127.0.0.1',
    expiresAt: new Date(Date.now() + 60_000),
  });
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

function draftContacts() {
  return {
    email: ['integration@example.com'],
    phoneNumber: ['+12125550101'],
    whatsApp: [],
    telegramNickname: [],
    telegramId: ['#1234567'],
    telegramPhoneNumber: ['+12125550102'],
    vKontakte: [],
    instagram: [],
    facebook: [],
    website: [],
    otherContact: [],
  };
}

function userDraft(roleId, overrides = {}) {
  return {
    id: null,
    userName: 'created_user',
    password: PASSWORD,
    firstName: 'Created',
    patronymic: null,
    lastName: 'User',
    roleId,
    draftAddress: { countryId: null, regionId: null, districtId: null, localityId: null },
    comment: null,
    isRestricted: false,
    causeOfRestriction: null,
    dateOfRestriction: null,
    draftContacts: draftContacts(),
    ...overrides,
  };
}

function simpleUpdate(id, main) {
  return {
    id,
    changingData: { main, address: null, contacts: null },
    restoringData: { addresses: null, names: null, userNames: null, contacts: null },
    outdatingData: { address: null, names: null, userName: null, contacts: null },
    deletingData: { userNames: null, names: null, addresses: null, contacts: null },
  };
}

describe('users API', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api.get('/api/users/check-user-name').query({ userName: 'test_user' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks permission', async () => {
    const role = await createRole({ name: 'No User Access Role' });

    const token = makeAccessToken(role.id);

    const res = await auth(global.api.post('/api/users/create-user'), token).send(
      userDraft(role.id),
    );

    expect(res.status).toBe(403);
  });

  test('checks user names case-insensitively and excludes the current user', async () => {
    const { role, token } = await createAuthorizedRole(['ADD_NEW_USER']);

    const user = await createStoredUser({ roleId: role.id, userName: 'CaseUser' });

    const existing = await auth(global.api.get('/api/users/check-user-name'), token).query({
      userName: 'caseuser',
    });

    expect(existing.status).toBe(200);
    expect(existing.body).toEqual({ code: 'ERRORS.USER.ALREADY_EXISTS', data: true });

    const self = await auth(global.api.get('/api/users/check-user-name'), token).query({
      userName: 'CASEUSER',
      id: user.id,
    });

    expect(self.status).toBe(200);
    expect(self.body).toEqual({ data: false });
  });

  test('detects another user with the same first and last name', async () => {
    const { role, token } = await createAuthorizedRole(['ADD_NEW_USER']);

    await createStoredUser({
      roleId: role.id,
      userName: 'duplicate_name_user',
      firstName: 'Anna',
      lastName: 'Smith',
    });

    const res = await auth(global.api.post('/api/users/check-user-data'), token).send({
      id: null,
      firstName: 'Anna',
      lastName: 'Smith',
      contacts: draftContacts(),
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'ERRORS.USER.HAS_DATA_DUPLICATES' });
    expect(res.body.data.duplicatesName).toContain('duplicate_name_user');
  });

  test('creates a user with hashed password, contacts, and search row', async () => {
    const { role, token } = await createAuthorizedRole(['ADD_NEW_USER']);

    const draft = userDraft(role.id);

    const res = await auth(global.api.post('/api/users/create-user'), token).send(draft);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ code: 'SUCCESS.CREATED', data: 'created_user' });

    const user = await User.findOne({ where: { userName: 'created_user' } });

    expect(user).not.toBeNull();
    expect(user.password).not.toBe(PASSWORD);
    expect(await verify(user.password, PASSWORD)).toBe(true);

    const contacts = await UserContact.findAll({ where: { userId: user.id }, raw: true });

    expect(contacts).toHaveLength(4);

    const searchRow = await UserSearch.findOne({
      where: { userId: user.id, isRestricted: false },
      raw: true,
    });

    expect(searchRow).not.toBeNull();
    expect(typeof searchRow.content).toBe('string');
  });

  test('returns 409 when creating a duplicate user name', async () => {
    const { role, token } = await createAuthorizedRole(['ADD_NEW_USER']);

    await createStoredUser({ roleId: role.id, userName: 'duplicate_user' });

    const res = await auth(global.api.post('/api/users/create-user'), token).send(
      userDraft(role.id, { userName: 'DUPLICATE_USER' }),
    );

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'ERRORS.USER.ALREADY_EXISTS' });
  });

  test('updates main user data', async () => {
    const { role, token } = await createAuthorizedRole(['EDIT_USER']);

    const user = await createStoredUser({ roleId: role.id, userName: 'update_user' });

    await UserSearch.create({ userId: user.id, content: 'old search content' });

    const res = await auth(global.api.post('/api/users/update-user'), token).send(
      simpleUpdate(user.id, { firstName: 'Updated', comment: 'Updated by integration test' }),
    );

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SUCCESS.UPDATED');
    expect(res.body.data).toMatchObject({
      id: user.id,
      firstName: 'Updated',
      comment: 'Updated by integration test',
    });

    const updated = await User.findByPk(user.id, { raw: true });

    expect(updated.firstName).toBe('Updated');
    expect(updated.comment).toBe('Updated by integration test');
  });

  test('returns a user by id without exposing password data', async () => {
    const { role, token } = await createAuthorizedRole(['VIEW_USER']);

    const user = await createStoredUser({
      roleId: role.id,
      userName: 'view_user',
      firstName: 'View',
      lastName: 'User',
    });

    const res = await auth(global.api.get(`/api/users/get-user-by-id/${user.id}`), token);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: user.id,
      userName: 'view_user',
      firstName: 'View',
      lastName: 'User',
      roleId: role.id,
      roleName: role.name,
    });
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.failedLoginCount).toBeUndefined();
  });

  test('returns only active users and preserves the total count for pagination', async () => {
    const { role, token } = await createAuthorizedRole(['VIEW_LIMITED_USERS_LIST']);

    await createStoredUser({ roleId: role.id, userName: 'active_one', firstName: 'Alpha' });

    await createStoredUser({ roleId: role.id, userName: 'active_two', firstName: 'Beta' });

    await createStoredUser({
      roleId: role.id,
      userName: 'blocked_one',
      firstName: 'Gamma',
      isRestricted: true,
      causeOfRestriction: 'Integration block',
      dateOfRestriction: new Date(),
    });

    const res = await auth(global.api.post('/api/users/get-users'), token).send({
      page: { size: 1, number: 0 },
      view: { option: 'only-active', includeOutdated: false },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].isRestricted).toBe(false);
    expect(res.body.data.list[0].password).toBeUndefined();
  });

  test('returns a simple user list for volunteer workflows', async () => {
    const { role, token } = await createAuthorizedRole(['VIEW_LIMITED_VOLUNTEERS_LIST']);

    await createStoredUser({
      roleId: role.id,
      userName: 'zoe_user',
      firstName: 'Zoe',
      lastName: 'Fox',
    });

    await createStoredUser({
      roleId: role.id,
      userName: 'anna_user',
      firstName: 'Anna',
      lastName: 'Smith',
    });

    const res = await auth(global.api.get('/api/users/get-list-of-users'), token);

    expect(res.status).toBe(200);
    expect(res.body.data.map((item) => item.name)).toEqual([
      'Anna Smith - anna_user',
      'Zoe Fox - zoe_user',
    ]);
  });

  test('allows a user to change their own password and revokes refresh tokens', async () => {
    const role = await createRole({ name: 'Password Role' });

    await createOperation({
      roleId: role.id,
      name: 'CHANGE_USER_PASSWORD',
      access: true,
      disabled: false,
    });

    const user = await createStoredUser({ roleId: role.id, userName: 'password_user' });

    await createRefreshToken(user.id);

    const token = makeAccessToken(role.id, user.id);

    const res = await auth(global.api.patch('/api/users/change-password'), token).send({
      userId: user.id,
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.UPDATED', data: null });

    const updated = await User.findByPk(user.id);

    expect(await verify(updated.password, NEW_PASSWORD)).toBe(true);
    expect(await verify(updated.password, PASSWORD)).toBe(false);

    const tokens = await RefreshToken.count({ where: { userId: user.id } });

    expect(tokens).toBe(0);
  });

  test('rejects an incorrect current password when changing own password', async () => {
    const role = await createRole({ name: 'Password Error Role' });

    await createOperation({
      roleId: role.id,
      name: 'CHANGE_USER_PASSWORD',
      access: true,
      disabled: false,
    });

    const user = await createStoredUser({ roleId: role.id, userName: 'wrong_password_user' });

    const token = makeAccessToken(role.id, user.id);

    const res = await auth(global.api.patch('/api/users/change-password'), token).send({
      userId: user.id,
      currentPassword: 'WrongPassword999',
      newPassword: NEW_PASSWORD,
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.USER.CURRENT_PASSWORD_INVALID' });

    const unchanged = await User.findByPk(user.id);

    expect(await verify(unchanged.password, PASSWORD)).toBe(true);
  });

  test('blocks a user and removes their refresh tokens', async () => {
    const { role, token } = await createAuthorizedRole(['BLOCK_USER']);

    const user = await createStoredUser({ roleId: role.id, userName: 'block_user' });

    await createRefreshToken(user.id);

    const res = await auth(global.api.patch('/api/users/block-user'), token).send({
      id: user.id,
      causeOfRestriction: 'Integration block',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'SUCCESS.UPDATED', data: null });

    const blocked = await User.findByPk(user.id, { raw: true });

    expect(blocked.isRestricted).toBe(true);
    expect(blocked.causeOfRestriction).toBe('Integration block');
    expect(blocked.dateOfRestriction).not.toBeNull();
    expect(await RefreshToken.count({ where: { userId: user.id } })).toBe(0);
  });

  test('unblocks a user and clears restriction data', async () => {
    const { role, token } = await createAuthorizedRole(['UNBLOCK_USER']);

    const user = await createStoredUser({
      roleId: role.id,
      userName: 'unblock_user',
      isRestricted: true,
      causeOfRestriction: 'Previous block',
      dateOfRestriction: new Date(),
    });

    const res = await auth(global.api.patch('/api/users/unblock-user'), token).send({
      id: user.id,
    });

    expect(res.status).toBe(200);

    const unblocked = await User.findByPk(user.id, { raw: true });

    expect(unblocked.isRestricted).toBe(false);
    expect(unblocked.causeOfRestriction).toBeNull();
    expect(unblocked.dateOfRestriction).toBeNull();
  });

  test('does not delete a user who is connected to a volunteer subscription', async () => {
    const { role, token } = await createAuthorizedRole(['DELETE_USER']);

    const user = await createStoredUser({ roleId: role.id, userName: 'dependent_user' });

    const volunteer = await createVolunteer({
      firstName: 'Dependency',
      patronymic: null,
      lastName: 'Volunteer',
      comment: null,
      isRestricted: false,
      causeOfRestriction: null,
      dateOfRestriction: null,
    });

    await VolunteerSubscription.create({ volunteerId: volunteer.id, userId: user.id });

    const check = await auth(
      global.api.get(`/api/users/check-user-before-delete/${user.id}`),
      token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ code: 'ERRORS.USER.HAS_DEPENDENCIES', data: 1 });

    const deletion = await auth(global.api.delete(`/api/users/delete-user/${user.id}`), token);

    expect(deletion.status).toBe(409);
    expect(deletion.body).toMatchObject({ code: 'ERRORS.USER.HAS_DEPENDENCIES' });

    const storedUser = await User.findByPk(user.id);

    expect(storedUser).not.toBeNull();
  });

  test('reports no dependencies for an unused user and deletes the user', async () => {
    const { role, token } = await createAuthorizedRole(['DELETE_USER']);

    const user = await createStoredUser({ roleId: role.id, userName: 'delete_user' });

    await createRefreshToken(user.id);

    const check = await auth(
      global.api.get(`/api/users/check-user-before-delete/${user.id}`),
      token,
    );

    expect(check.status).toBe(200);
    expect(check.body).toEqual({ data: 0 });

    const deletion = await auth(global.api.delete(`/api/users/delete-user/${user.id}`), token);

    expect(deletion.status).toBe(200);
    expect(deletion.body).toEqual({ code: 'SUCCESS.DELETED', data: null });
    expect(await User.findByPk(user.id)).toBeNull();
    expect(await RefreshToken.count({ where: { userId: user.id } })).toBe(0);
  });
});
