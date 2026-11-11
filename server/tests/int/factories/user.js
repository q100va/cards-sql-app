import { User } from '../../../models/index.js';
import { hashPassword } from '../../../controllers/passwords.mjs';

/**
 * Create a user with sensible test defaults.
 * The password is stored exactly as provided.
 */
export async function createUser(attrs = {}) {
  const defaults = {
    userName: `user_${Date.now()}`,
    roleId: null,
    isBlocked: false,
    firstName: 'John',
    lastName: 'Fox',
    password: 'password2025',
  };

  const data = { ...defaults, ...attrs };
  const user = await User.create(data);

  return user.get({ plain: true });
}

/**
 * Create a user with a hashed password.
 */
export async function createUserHashed(attrs = {}) {
  const user = await User.create({
    userName: `user_${Date.now()}`,
    roleId: null,
    isBlocked: false,
    firstName: 'John',
    lastName: 'Fox',
    password: await hashPassword(
      attrs.password ?? 'password2025',
    ),
    ...attrs,
  });

  return user.get({ plain: true });
}

/**
 * Count users assigned to a role.
 */
export async function countUsersByRole(roleId) {
  return User.count({ where: { roleId } });
}

/**
 * Truncate the users table.
 * Intended for integration tests only.
 */
export async function truncateUsers({ cascade = true } = {}) {
  await User.destroy({
    where: {},
    truncate: true,
    cascade,
  });
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
