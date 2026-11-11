import { applyFailedLoginState, applySuccessfulLoginReset, SECURITY } from '../../domain/auth-throttle.js';

describe('auth-throttle', () => {
  const now = new Date('2025-09-15T12:00:00Z');

  const base = () =>
  ({
    failedLoginCount: 0,
    lockedUntil: null,
    bruteWindowStart: null,
    bruteStrikeCount: 0,
    isRestricted: false,
  });

  test('increments failed login count before lock threshold', () => {
    let state = base();

    for (let attempt = 1; attempt < SECURITY.FAILS_TO_LOCK; attempt += 1) {
      const result = applyFailedLoginState(state, now);

      state = result.nextState;

      expect(state.failedLoginCount).toBe(attempt);

      expect(state.lockedUntil).toBeNull();

      expect(result.events).toEqual([]);
    }
  });

  test('locks account when failure threshold is reached', () => {
    const state = {
      ...base(),
      failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
    };

    const {
      nextState,
      events,
    } = applyFailedLoginState(state, now);

    expect(events).toContain('locked');

    expect(nextState.failedLoginCount).toBe(0);

    expect(nextState.lockedUntil.getTime()).toBe(now.getTime() + SECURITY.LOCK_MS);

    expect(nextState.bruteWindowStart.getTime()).toBe(now.getTime());

    expect(nextState.bruteStrikeCount).toBe(1);

    expect(nextState.isRestricted).toBe(false);
  });

  test('restricts account after repeated locks within the brute-force window', () => {
    let state = base();

    for (let strike = 1; strike <= SECURITY.STRIKES; strike += 1) {
      const time = new Date(now.getTime() + (strike - 1) * 60 * 60_000);

      const result = applyFailedLoginState({
        ...state,
        failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
      }, time);

      state = result.nextState;

      expect(state.bruteStrikeCount).toBe(strike);

      if (strike < SECURITY.STRIKES) {
        expect(state.isRestricted).toBe(false);

        expect(result.events).not.toContain('restricted');
      } else {
        expect(state.isRestricted).toBe(true);

        expect(state.causeOfRestriction).toBe('daily_lockout');

        expect(state.dateOfRestriction.getTime()).toBe(time.getTime());

        expect(result.events).toContain('restricted');
      }
    }
  });

  test('counts a lock exactly at the window boundary', () => {
    const first = applyFailedLoginState({
      ...base(),
      failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
    }, now).nextState;

    const boundary = new Date(now.getTime() + SECURITY.WINDOW_MS);

    const second = applyFailedLoginState({
      ...first,
      failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
    }, boundary).nextState;

    expect(second.bruteStrikeCount).toBe(2);

    expect(second.bruteWindowStart.getTime()).toBe(now.getTime());
  });

  test('starts a new brute-force window when previous window has expired', () => {
    const first = applyFailedLoginState({
      ...base(),
      failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
    }, now).nextState;

    const outsideWindow = new Date(now.getTime() + SECURITY.WINDOW_MS + 1);

    const second = applyFailedLoginState({
      ...first,
      failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
    }, outsideWindow).nextState;

    expect(second.bruteStrikeCount).toBe(1);

    expect(second.bruteWindowStart.getTime()).toBe(outsideWindow.getTime());

    expect(second.isRestricted).toBe(false);
  });

  test('successful login clears temporary failure count and lock only', () => {
    const state = {
      ...base(),
      failedLoginCount: 3,
      lockedUntil: new Date(now.getTime() + 10_000),
      bruteWindowStart: now,
      bruteStrikeCount: 2,
    };

    const {
      nextState,
      touched,
    } = applySuccessfulLoginReset(state);

    expect(touched).toBe(true);

    expect(nextState.failedLoginCount).toBe(0);

    expect(nextState.lockedUntil).toBeNull();

    expect(nextState.bruteWindowStart).toBe(now);

    expect(nextState.bruteStrikeCount).toBe(2);
  });

  test('successful login reset reports untouched when there is nothing to clear', () => {
    const state = base();

    const {
      nextState,
      touched,
    } = applySuccessfulLoginReset(state);

    expect(touched).toBe(false);

    expect(nextState).toEqual(state);
  });

  test('does not mutate the input state', () => {
    const state = {
      ...base(),
      failedLoginCount: SECURITY.FAILS_TO_LOCK - 1,
    };

    const snapshot = { ...state };

    applyFailedLoginState(state, now);

    expect(state).toEqual(snapshot);
  });
});
