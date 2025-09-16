// tests/unit/auth-throttle.test.mjs
import { applyFailedLoginState, applySuccessfulLoginReset, SECURITY } from '../../controllers/auth-throttle.js';

describe('auth-throttle (pure)', () => {
  const base = () => ({
    failedLoginCount: 0,
    lockedUntil: null,
    bruteWindowStart: null,
    bruteStrikeCount: 0,
    isRestricted: false,
  });
  const now = new Date('2025-09-15T12:00:00Z');

  test('increments failedLoginCount until threshold', () => {
    let u = base();
    for (let i = 1; i < SECURITY.FAILS_TO_LOCK; i++) {
      const { nextState, events } = applyFailedLoginState(u, now);
      u = nextState;
      expect(u.failedLoginCount).toBe(i);
      expect(events).toEqual([]);
      expect(u.lockedUntil).toBeNull();
    }
  });

  test('on 7th failure → lock; counter reset; window start and strike=1', () => {
    let u = { ...base(), failedLoginCount: SECURITY.FAILS_TO_LOCK - 1 };
    const { nextState, events } = applyFailedLoginState(u, now);
    expect(events).toContain('locked');
    expect(nextState.failedLoginCount).toBe(0);
    expect(nextState.lockedUntil.getTime()).toBe(now.getTime() + SECURITY.LOCK_MS);
    expect(nextState.bruteWindowStart.getTime()).toBe(now.getTime());
    expect(nextState.bruteStrikeCount).toBe(1);
    expect(nextState.isRestricted).toBe(false);
  });

  test('3 locks within 24h → restricted', () => {
    let u = base();

    // 1-й лок
    ({ nextState: u } = applyFailedLoginState({ ...u, failedLoginCount: SECURITY.FAILS_TO_LOCK - 1 }, now));
    expect(u.bruteStrikeCount).toBe(1);

    // 2-й лок через 1 час (внутри окна)
    const t2 = new Date(now.getTime() + 60 * 60_000);
    ({ nextState: u } = applyFailedLoginState({ ...u, failedLoginCount: SECURITY.FAILS_TO_LOCK - 1 }, t2));
    expect(u.bruteStrikeCount).toBe(2);
    expect(u.isRestricted).toBe(false);

    // 3-й лок через ещё час → restricted
    const t3 = new Date(now.getTime() + 2 * 60 * 60_000);
    const res3 = applyFailedLoginState({ ...u, failedLoginCount: SECURITY.FAILS_TO_LOCK - 1 }, t3);
    u = res3.nextState;
    expect(res3.events).toContain('restricted');
    expect(u.isRestricted).toBe(true);
    expect(u.causeOfRestriction).toBe('daily_lockout');
    expect(u.dateOfRestriction.getTime()).toBe(t3.getTime());
  });

  test('lock outside the 24h window resets brute counters', () => {
    // Лок №1 в now
    let u = applyFailedLoginState({ ...base(), failedLoginCount: SECURITY.FAILS_TO_LOCK - 1 }, now).nextState;
    expect(u.bruteStrikeCount).toBe(1);
    // Лок №2 через 25 часов — окно сброшено, strike снова 1
    const t2 = new Date(now.getTime() + (SECURITY.WINDOW_MS + 60_000));
    u.failedLoginCount = SECURITY.FAILS_TO_LOCK - 1;
    const res2 = applyFailedLoginState(u, t2);
    u = res2.nextState;
    expect(u.bruteStrikeCount).toBe(1);
    expect(u.bruteWindowStart.getTime()).toBe(t2.getTime());
    expect(u.isRestricted).toBe(false);
  });

  test('successful login reset clears counters/lock', () => {
    const u = {
      failedLoginCount: 3,
      lockedUntil: new Date(now.getTime() + 10_000),
      bruteWindowStart: now,
      bruteStrikeCount: 1,
      isRestricted: false,
    };
    const { nextState, touched } = applySuccessfulLoginReset(u);
    expect(touched).toBe(true);
    expect(nextState.failedLoginCount).toBe(0);
    expect(nextState.lockedUntil).toBeNull();
    // Внимание: окно/страйки обычно НЕ трогаем на успешный вход (по требованиям — на твой выбор).
  });
});
