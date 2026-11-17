import { User } from '../../../models/index.js';
import { hashPassword } from '../../../security/passwords.mjs';

/**
 * Create a user with sensible test defaults.
 * The password is stored exactly as provided.
 */
export async function createUserInstance(attrs = {}) {
  const defaults = {
    userName: `user_${Date.now()}`,
    roleId: null,
    patronymic: null,
    comment: null,
    isRestricted: false,
    causeOfRestriction: null,
    dateOfRestriction: null,
    firstName: 'John',
    lastName: 'Fox',
    password: 'password2025',
  };

  const data = { ...defaults, ...attrs };
  return User.create(data);
}

/**
 * Return a plain object when model instance methods are not needed.
 */
export async function createUser(attrs = {}) {
  const user = await createUserInstance(attrs);
  return user.get({ plain: true });
}

/**
 * Hash the supplied plaintext password before creating the row.
 */
export async function createUserHashed(attrs = {}) {
  const { password = 'password2025', ...overrides } = attrs;
  return createUser({ ...overrides, password: await hashPassword(password) });
}

/**
 * Count users assigned to a role.
 */
export async function countUsersByRole(roleId) {
  return User.count({ where: { roleId } });
}

/**
 * Create multiple users sequentially.
 */
export async function seedUsers(list = []) {
  const results = [];

  for (const data of list) {
    results.push(await createUser(data));
  }

  return results;
}
