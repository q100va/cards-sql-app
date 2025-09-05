import { User } from '../../models';

export async function createUser(attrs = {}) {
  const defaults = {
    name: `user_${Date.now()}`,
    email: `u_${Math.random().toString(36).slice(2,8)}@test.local`,
    roleId: null,
    isBlocked: false,
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
