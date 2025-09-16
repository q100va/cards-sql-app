// server/routes/session-api.js
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { requireAccess } from '../middlewares/require-access.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { signInReqSchema } from '../../shared/dist/auth.schema.js';
import { auditAuthFail } from '../logging/audit-auth.js';
import { verify, DUMMY_ARGON2_HASH } from '../controllers/passwords.mjs';
import { signInIpLimiter, signInUserLimiter, resetKey, loginKey, signInUaLimiter, signInGlobalLimiter } from '../controllers/rate-limit.js';
import { mintTokenPair, setRefreshCookie, clearRefreshCookie, ACCESS_TTL_SEC, REFRESH_SECRET } from '../controllers/token.js';
import { User, Role, RefreshToken } from '../models/index.js';
const router = Router();

// Параметры DB-блокировок
const FAILS_TO_LOCK = 7;             // после 7 неверных паролей
const LOCK_DURATION_MS = 15 * 60_000;   // 15 минут
const ESCALATION_WINDOW = 24 * 60 * 60_000; // 24 часа
const ESCALATION_STRIKES = 3;             // 3 блокировки за 24ч => isRestricted=true

// === POST /api/session/sign-in ===
router.post('/sign-in', validateRequest(signInReqSchema), async (req, res, next) => {
  const { userName, password } = req.body ?? {};
  const userKey = loginKey(userName);
  const ipKey = req.ip;
  const ua = req.get('user-agent') || '';
  const uaKey = crypto.createHash('sha256').update(ua).digest('hex').slice(0, 16);

  try {
    // 0) Per-user лимитер — СНАЧАЛА. Не трогаем БД при оверфлоу.
    try {
      await signInUserLimiter.consume(userKey);
    } catch (rlUser) {
      const retrySec = Math.ceil((rlUser?.msBeforeNext ?? 0) / 1000);
      res.setHeader('Retry-After', retrySec);
      await auditAuthFail(req, { event: 'login_blocked', reason: 'user_rate_limit', entityId: userName });
      return res.status(429).json({ code: 'ERRORS.TOO_MANY_ATTEMPTS', data: { retryAfterSec: retrySec } });
    }

    // 1) Anti-storm лимитеры (тоже без касания БД)
    try { await signInIpLimiter.consume(ipKey); } catch (rl) {
      const retrySec = Math.ceil((rl?.msBeforeNext ?? 0) / 1000);
      res.setHeader('Retry-After', retrySec);
      await auditAuthFail(req, { event: 'login_blocked', reason: 'ip_rate_limit', entityId: userName });
      return res.status(429).json({ code: 'ERRORS.TOO_MANY_ATTEMPTS', data: { retryAfterSec: retrySec } });
    }
    try { await signInUaLimiter.consume(uaKey); } catch (rl) {
      const retrySec = Math.ceil((rl?.msBeforeNext ?? 0) / 1000);
      res.setHeader('Retry-After', retrySec);
      await auditAuthFail(req, { event: 'login_blocked', reason: 'ua_rate_limit', entityId: userName });
      return res.status(429).json({ code: 'ERRORS.TOO_MANY_ATTEMPTS', data: { retryAfterSec: retrySec } });
    }
    try { await signInGlobalLimiter.consume('ALL'); } catch (rl) {
      const retrySec = Math.ceil((rl?.msBeforeNext ?? 0) / 1000);
      res.setHeader('Retry-After', retrySec);
      await auditAuthFail(req, { event: 'login_blocked', reason: 'global_rate_limit' });
      return res.status(429).json({ code: 'ERRORS.TOO_MANY_ATTEMPTS', data: { retryAfterSec: retrySec } });
    }

    // 2) Ищем пользователя (не раскрывая существования)
    const user = await User.findOne({
      where: { userName },
      attributes: [
        'id', 'userName', 'firstName', 'lastName', 'password',
        'isRestricted', 'failedLoginCount', 'lockedUntil', 'bruteWindowStart', 'bruteStrikeCount'
      ],
      include: [{ model: Role, attributes: ['name'] }],
    });

    if (!user) {
      // имитация затрат времени на hash-verify
      if (DUMMY_ARGON2_HASH) { try { await verify(DUMMY_ARGON2_HASH, password ?? ''); } catch { } }
      await auditAuthFail(req, { event: 'login_failed', reason: 'unknown_user', entityId: userName });
      return res.status(401).json({ code: 'ERRORS.INVALID_AUTHORIZATION', data: null });
    }

    // 3) Статусы аккаунта
    const now = new Date();
    if (user.isRestricted) {
      await auditAuthFail(req, { event: 'login_blocked', userId: user.id, reason: 'user_restricted' });
      return res.status(423).json({ code: 'ERRORS.ACCOUNT_RESTRICTED', data: null });
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > now) {
      await auditAuthFail(req, {
        event: 'login_blocked', userId: user.id, reason: 'user_locked',
        details: { lockedUntil: user.lockedUntil },
      });
      return res.status(423).json({ code: 'ERRORS.ACCOUNT_LOCKED', data: null });
    }

    // 4) Проверяем пароль
    const ok = await verify(user.password, password ?? '');
    if (!ok) {
      const { events, state } = await user.registerFailedLogin(now /*, SECURITY, { transaction: t }*/);
      if (events.includes('locked')) {
        await auditAuthFail(req, {
          event: 'user_locked', userId: user.id, reason: 'user_rate_limit',
          details: { lockedUntil: state.lockedUntil },
        });
      }
      if (events.includes('restricted')) {
        await auditAuthFail(req, {
          event: 'user_restricted', userId: user.id, reason: 'daily_lockout',
          details: { strikeCount: state.bruteStrikeCount, windowStart: state.bruteWindowStart },
        });
      }
      const attemptsLeft = events.includes('locked')
        ? 0
        : Math.max(0, FAILS_TO_LOCK - (state.failedLoginCount ?? 0));
      await auditAuthFail(req, { event: 'login_failed', userId: user.id, reason: 'bad_password', details: { attemptsLeft } });
      return res.status(401).json({ code: 'ERRORS.INVALID_AUTHORIZATION', data: null });
    }

    // 5) Успех → сбрасываем флаги и лимитер
    /*    if (user.failedLoginCount || user.lockedUntil) {
         user.failedLoginCount = 0;
         user.lockedUntil = null;
         await user.save();
       } */
    await user.resetAfterSuccess(/* { transaction: t } */);
    try { await resetKey(signInUserLimiter, userKey); } catch { }

    // 6) Мятим токены
    const { accessToken, refreshToken } = await mintTokenPair(user, { ua, ip: req.ip });
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      data: {
        user: {
          id: user.id,
          userName: user.userName,
          firstName: user.firstName,
          lastName: user.lastName,
          roleName: user.role?.name ?? null,
        },
        token: accessToken,
        expiresIn: ACCESS_TTL_SEC,
      },
    });
  } catch (err) {
    err.code = 'ERRORS.UNAUTHORIZED_CATCH';
    return next(err);
  }
});


// === POST /api/session/refresh ===
// читает refresh из HttpOnly cookie, делает ротацию, отдаёт новый access + новый refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const raw = req.cookies?.rt;
    if (!raw) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });

    let payload;
    try {
      payload = jwt.verify(raw, REFRESH_SECRET, { issuer: 'cards-sql-app', audience: 'web' });
    } catch {
      return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
    }

    const { sub, jti } = payload ?? {};
    if (!sub || !jti) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });

    // находим пользователя
    const user = await User.findByPk(sub, {
      attributes: ['id', 'userName', 'firstName', 'lastName'],
      include: [{ model: Role, attributes: ['name'] }],
    });
    if (!user) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });

    const tokenRow = await RefreshToken.findOne({ where: { id: jti, userId: Number(sub) } });
    if (!tokenRow) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });

    const now = new Date();
    if (tokenRow.revokedAt || tokenRow.rotatedAt || tokenRow.expiresAt <= now) {
      // токен уже использовали/протух/отозван → нельзя
      await auditAuthFail(req, {
        event: 'refresh_failed',
        reason: tokenRow.revokedAt ? 'token_revoked' : (tokenRow.rotatedAt ? 'token_rotated' : 'token_expired'),
        userId: Number(sub),
      });

      return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
    }

    // помечаем текущий refresh как "повёрнутый"
    tokenRow.rotatedAt = now;
    await tokenRow.save();

    // выдаём новую пару
    const { accessToken, refreshToken } = await mintTokenPair(user, {
      ua: req.get('user-agent'),
      ip: req.ip,
    });

    // связываем старый с новым
    const newPayload = jwt.decode(refreshToken);
    if (newPayload?.jti) {
      tokenRow.replacedByTokenId = newPayload.jti;
      await tokenRow.save();
    }

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      data: {
        accessToken,
        expiresIn: ACCESS_TTL_SEC,
      },
    });
  } catch (err) {
    err.code = 'ERRORS.UNAUTHORIZED';
    return next(err);
  }
});

// === POST /api/session/sign-out ===
// чистим cookie и ревокируем активный refresh (если есть)
router.post('/sign-out', async (req, res, next) => {
  try {
    const raw = req.cookies?.rt;
    clearRefreshCookie(res);

    if (raw) {
      try {
        const payload = jwt.verify(raw, REFRESH_SECRET, { ignoreExpiration: true });
        if (payload?.jti) {
          const row = await RefreshToken.findOne({ where: { id: payload.jti } });
          if (row && !row.revokedAt) {
            row.revokedAt = new Date();
            await row.save();
          }
        }
      } catch {
        // не фатально
      }
    }

    return res.status(200).json({ data: null });
  } catch (err) {
    err.code = 'ERRORS.UNAUTHORIZED';
    return next(err);
  }
});

// === (опционально) быстрый /me для клиента ===
router.get('/me', requireAccess, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'userName', 'firstName', 'lastName'],
      include: [{ model: Role, attributes: ['name'] }],
    });
    if (!user) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });

    return res.status(200).json({
      data: {
        id: user.id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        roleName: user.role?.name ?? null,
      }
    });
  } catch (err) {
    err.code = 'ERRORS.UNAUTHORIZED';
    return next(err);
  }
});

export default router;
