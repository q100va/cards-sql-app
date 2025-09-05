import { User } from '../../models';

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

export async function countUsersByRole(roleId) {
  return User.count({ where: { roleId } });
}

export async function truncateUsers({ cascade = true } = {}) {
  await User.destroy({ where: {}, truncate: true, cascade });
}

export async function seedUsers(list = []) {
  const results = [];
  for (const data of list) {
    results.push(await createUser(data));
  }
  return results;
}
