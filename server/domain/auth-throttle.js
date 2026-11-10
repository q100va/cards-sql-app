export const SECURITY = {
  FAILS_TO_LOCK: 7,
  LOCK_MS: 15 * 60_000,
  WINDOW_MS: 24 * 60 * 60_000,
  STRIKES: 3,
};

/**
 * Calculates the next authentication throttle state
 * after a failed login attempt.
 */
export function applyFailedLoginState(
  user,
  now = new Date(),
  cfg = SECURITY,
) {
  const out = { ...user };
  const events = [];

  const previousFailedCount =
    out.failedLoginCount ?? 0;

  out.failedLoginCount =
    previousFailedCount + 1;

  if (
    out.failedLoginCount <
    cfg.FAILS_TO_LOCK
  ) {
    return {
      nextState: out,
      events,
    };
  }

  out.failedLoginCount = 0;
  out.lockedUntil =
    new Date(
      now.getTime() +
        cfg.LOCK_MS,
    );

  events.push('locked');

  const windowStart =
    out.bruteWindowStart
      ? new Date(
          out.bruteWindowStart,
        )
      : null;

  const isWithinWindow =
    windowStart !== null &&
    !Number.isNaN(
      windowStart.getTime(),
    ) &&
    now.getTime() -
      windowStart.getTime() <=
      cfg.WINDOW_MS;

  if (isWithinWindow) {
    out.bruteStrikeCount =
      (out.bruteStrikeCount ?? 0) +
      1;
  } else {
    out.bruteWindowStart = now;
    out.bruteStrikeCount = 1;
  }

  if (
    out.bruteStrikeCount >=
    cfg.STRIKES
  ) {
    out.isRestricted = true;
    out.causeOfRestriction =
      'daily_lockout';
    out.dateOfRestriction = now;

    events.push('restricted');
  }

  return {
    nextState: out,
    events,
  };
}

/**
 * Clears temporary lock state after
 * a successful login.
 */
export function applySuccessfulLoginReset(
  user,
) {
  const out = { ...user };

  const touched =
    Boolean(
      out.failedLoginCount ||
        out.lockedUntil,
    );

  if (touched) {
    out.failedLoginCount = 0;
    out.lockedUntil = null;
  }

  return {
    nextState: out,
    touched,
  };
}
