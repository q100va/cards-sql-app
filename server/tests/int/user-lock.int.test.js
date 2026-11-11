import { SECURITY } from '../../domain/auth-throttle.js';

const NOW = new Date('2026-11-11T12:00:00.000Z');

let User;
let createRole;

beforeAll(async () => {
  ({ User } = await import('../../models/index.js'));
  ({ createRole } = await import('./factories/role.js'));
});

async function createUser(overrides = {}) {
  const role = await createRole({ name: 'User Lock Test Role' });

  return User.create({
    userName: overrides.userName ?? 'lock_test_user',
    password: 'not-used-in-this-test',
    firstName: 'Lock',
    patronymic: null,
    lastName: 'User',
    roleId: role.id,
    comment: null,
    failedLoginCount: overrides.failedLoginCount ?? 0,
    lockedUntil: overrides.lockedUntil ?? null,
    bruteWindowStart: overrides.bruteWindowStart ?? null,
    bruteStrikeCount: overrides.bruteStrikeCount ?? 0,
    isRestricted: overrides.isRestricted ?? false,
    causeOfRestriction: overrides.causeOfRestriction ?? null,
    dateOfRestriction: overrides.dateOfRestriction ?? null,
  });
}

async function triggerLock(user, at) {
  user.failedLoginCount = SECURITY.FAILS_TO_LOCK - 1;
  await user.save();
  return user.registerFailedLogin(at);
}

describe('user login lock state', () => {
  test('persists failed attempts below lock threshold', async () => {
    const user = await createUser();

    for (let i = 0; i < 3; i += 1) {
      const { events } = await user.registerFailedLogin(NOW);
      expect(events).toEqual([]);
    }

    await user.reload();

    expect(user.failedLoginCount).toBe(3);
    expect(user.lockedUntil).toBeNull();
    expect(user.bruteStrikeCount).toBe(0);
    expect(user.bruteWindowStart).toBeNull();
    expect(user.isRestricted).toBe(false);
  });

  test('locks user at failed-login threshold and starts strike window', async () => {
    const user = await createUser({ failedLoginCount: SECURITY.FAILS_TO_LOCK - 1 });

    const { events, state } = await user.registerFailedLogin(NOW);

    expect(events).toContain('locked');
    expect(events).not.toContain('restricted');

    await user.reload();

    expect(user.failedLoginCount).toBe(0);
    expect(user.lockedUntil.getTime()).toBe(NOW.getTime() + SECURITY.LOCK_MS);
    expect(user.bruteWindowStart.getTime()).toBe(NOW.getTime());
    expect(user.bruteStrikeCount).toBe(1);
    expect(user.isRestricted).toBe(false);
    expect(state.bruteStrikeCount).toBe(1);
  });

  test('restricts user after configured lockouts within strike window', async () => {
    const user = await createUser();
    let time;

    for (let strike = 1; strike <= SECURITY.STRIKES; strike += 1) {
      time = new Date(NOW.getTime() + (strike - 1) * (SECURITY.LOCK_MS + 1000));

      const { events } = await triggerLock(user, time);

      expect(events).toContain('locked');

      if (strike < SECURITY.STRIKES) {
        expect(events).not.toContain('restricted');
      } else {
        expect(events).toContain('restricted');
      }

      await user.reload();
      expect(user.bruteStrikeCount).toBe(strike);
    }

    expect(user.isRestricted).toBe(true);
    expect(user.causeOfRestriction).toBe('daily_lockout');
    expect(user.dateOfRestriction.getTime()).toBe(time.getTime());
  });

  test('starts new strike window after previous window expires', async () => {
    const user = await createUser({
      failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
      bruteWindowStart: NOW,
      bruteStrikeCount: SECURITY.STRIKES - 1,
    });

    const afterWindow = new Date(NOW.getTime() + SECURITY.WINDOW_MS + 1);
    const { events } = await user.registerFailedLogin(afterWindow);

    expect(events).toContain('locked');
    expect(events).not.toContain('restricted');

    await user.reload();

    expect(user.bruteStrikeCount).toBe(1);
    expect(user.bruteWindowStart.getTime()).toBe(afterWindow.getTime());
    expect(user.isRestricted).toBe(false);
    expect(user.causeOfRestriction).toBeNull();
  });

  test('successful login clears temporary lock state but keeps strike history', async () => {
    const user = await createUser({
      failedLoginCount: 4,
      lockedUntil: new Date(NOW.getTime() + SECURITY.LOCK_MS),
      bruteWindowStart: NOW,
      bruteStrikeCount: 1,
    });

    const { touched } = await user.resetAfterSuccess();

    expect(touched).toBe(true);

    await user.reload();

    expect(user.failedLoginCount).toBe(0);
    expect(user.lockedUntil).toBeNull();
    expect(user.bruteStrikeCount).toBe(1);
    expect(user.bruteWindowStart.getTime()).toBe(NOW.getTime());
    expect(user.isRestricted).toBe(false);
  });
});
