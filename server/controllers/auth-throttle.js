// server/domain/auth-throttle.js
export const SECURITY = {
  FAILS_TO_LOCK: 7,
  LOCK_MS: 15 * 60_000,           // 15m
  WINDOW_MS: 24 * 60 * 60_000,    // 24h
  STRIKES: 3,
};

/**
 * Чистая функция: на вход — POJO пользователя (или instance.toJSON()),
 * на выход — новые значения полей и список событий.
 */
export function applyFailedLoginState(user, now = new Date(), cfg = SECURITY) {
  const out = { ...user };
  const events = [];

  // 1) Инкремент счётчика
  const prev = out.failedLoginCount ?? 0;
  out.failedLoginCount = prev + 1;

  // 2) Дошли до порога → лок + эскалация
  if (out.failedLoginCount >= cfg.FAILS_TO_LOCK) {
    out.failedLoginCount = 0;
    out.lockedUntil = new Date(now.getTime() + cfg.LOCK_MS);
    events.push('locked');

    // окно для подсчёта локов
    const winStart = out.bruteWindowStart ? new Date(out.bruteWindowStart) : null;
    const inWindow = winStart && (now.getTime() - winStart.getTime()) <= cfg.WINDOW_MS;

    if (!inWindow) {
      out.bruteWindowStart = now;
      out.bruteStrikeCount = 1;
    } else {
      out.bruteStrikeCount = (out.bruteStrikeCount ?? 0) + 1;
    }

    // эскалация до restricted
    if ((out.bruteStrikeCount ?? 0) >= cfg.STRIKES) {
      out.isRestricted = true;
      out.causeOfRestriction = 'daily_lockout';
      out.dateOfRestriction = now;
      events.push('restricted');
    }
  }

  return { nextState: out, events };
}

/** Успешный вход: сброс состояния */
export function applySuccessfulLoginReset(user) {
  const out = { ...user };
  let touched = false;

  if (out.failedLoginCount || out.lockedUntil) {
    out.failedLoginCount = 0;
    out.lockedUntil = null;
    touched = true;
  }
  return { nextState: out, touched };
}
