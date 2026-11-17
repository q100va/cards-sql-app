// server/routes/session-api.js

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import sequelize from '../database.js';
import requireAuth from '../middlewares/check-auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { signInReqSchema } from '../../shared/dist/schemas/auth.schema.js';

import { auditAuthEvent } from '../audit/audit-auth.js';
import { SECURITY } from '../domain/auth-throttle.js';
import {
  verify,
  DUMMY_ARGON2_HASH,
} from '../security/passwords.mjs';
import {
  signInIpLimiter,
  signInUserLimiter,
  resetKey,
  loginKey,
  signInUaLimiter,
  signInGlobalLimiter,
} from '../security/rate-limit.js';
import {
  mintTokenPair,
  setRefreshCookie,
  clearRefreshCookie,
  ACCESS_TTL_SEC,
  REFRESH_SECRET,
} from '../controllers/token.js';

import {
  User,
  Role,
  RefreshToken,
} from '../models/index.js';


const router = Router();

// Verify and parse refresh JWT using the same rules everywhere.
function verifyRefreshToken(
  token,
  {
    ignoreExpiration = false,
  } = {},
) {
  return jwt.verify(
    token,
    REFRESH_SECRET,
    {
      issuer: 'cards-sql-app',
      audience: 'web',
      algorithms: ['HS256'],
      ignoreExpiration,
    },
  );
}

// Sign in: apply rate limits, validate credentials,
// update lockout state, and issue a new token pair.
router.post(
  '/sign-in',
  validateRequest(signInReqSchema),
  async (req, res, next) => {
    const {
      userName,
      password,
    } = req.body ?? {};

    const userKey =
      loginKey(userName);

    const ipKey =
      req.ip;

    const userAgent =
      req.get('user-agent') ?? '';

    const uaKey =
      crypto
        .createHash('sha256')
        .update(userAgent)
        .digest('hex')
        .slice(0, 16);

    // Reject excessive login attempts before querying the database.
    try {
      try {
        await signInUserLimiter.consume(
          userKey,
        );
      } catch (rateLimitError) {
        const retryAfterSec =
          Math.ceil(
            (
              rateLimitError
                ?.msBeforeNext ?? 0
            ) / 1000,
          );

        res.setHeader(
          'Retry-After',
          retryAfterSec,
        );

        await auditAuthEvent(req, {
          event: 'login_blocked',
          reason: 'user_rate_limit',
          entityId: userName,
        });

        return res.status(429).json({
          code:
            'ERRORS.TOO_MANY_ATTEMPTS',
          data: {
            retryAfterSec,
          },
        });
      }

      try {
        await signInIpLimiter.consume(
          ipKey,
        );
      } catch (rateLimitError) {
        const retryAfterSec =
          Math.ceil(
            (
              rateLimitError
                ?.msBeforeNext ?? 0
            ) / 1000,
          );

        res.setHeader(
          'Retry-After',
          retryAfterSec,
        );

        await auditAuthEvent(req, {
          event: 'login_blocked',
          reason: 'ip_rate_limit',
          entityId: userName,
        });

        return res.status(429).json({
          code:
            'ERRORS.TOO_MANY_ATTEMPTS',
          data: {
            retryAfterSec,
          },
        });
      }

      try {
        await signInUaLimiter.consume(
          uaKey,
        );
      } catch (rateLimitError) {
        const retryAfterSec =
          Math.ceil(
            (
              rateLimitError
                ?.msBeforeNext ?? 0
            ) / 1000,
          );

        res.setHeader(
          'Retry-After',
          retryAfterSec,
        );

        await auditAuthEvent(req, {
          event: 'login_blocked',
          reason: 'ua_rate_limit',
          entityId: userName,
        });

        return res.status(429).json({
          code:
            'ERRORS.TOO_MANY_ATTEMPTS',
          data: {
            retryAfterSec,
          },
        });
      }

      try {
        await signInGlobalLimiter.consume(
          'ALL',
        );
      } catch (rateLimitError) {
        const retryAfterSec =
          Math.ceil(
            (
              rateLimitError
                ?.msBeforeNext ?? 0
            ) / 1000,
          );

        res.setHeader(
          'Retry-After',
          retryAfterSec,
        );

        await auditAuthEvent(req, {
          event: 'login_blocked',
          reason: 'global_rate_limit',
        });

        return res.status(429).json({
          code:
            'ERRORS.TOO_MANY_ATTEMPTS',
          data: {
            retryAfterSec,
          },
        });
      }

      // Load authentication state without revealing whether the username exists.
      const user =
        await User.findOne({
          where: {
            userName,
          },
          attributes: [
            'id',
            'userName',
            'firstName',
            'lastName',
            'password',
            'roleId',
            'isRestricted',
            'failedLoginCount',
            'lockedUntil',
            'bruteWindowStart',
            'bruteStrikeCount',
          ],
          include: [
            {
              model: Role,
              attributes: [
                'id',
                'name',
              ],
            },
          ],
        });

      if (!user) {
        await verify(
          DUMMY_ARGON2_HASH,
          password ?? '',
        );

        await auditAuthEvent(req, {
          event: 'login_failed',
          reason: 'unknown_user',
          entityId: userName,
        });

        return res.status(401).json({
          code:
            'ERRORS.INVALID_AUTHORIZATION',
          data: null,
        });
      }

      const now = new Date();

      if (user.isRestricted) {
        await auditAuthEvent(req, {
          event: 'login_blocked',
          userId: user.id,
          reason: 'user_restricted',
        });

        return res.status(423).json({
          code:
            'ERRORS.ACCOUNT_RESTRICTED',
          data: null,
        });
      }

      if (
        user.lockedUntil &&
        new Date(user.lockedUntil) > now
      ) {
        await auditAuthEvent(req, {
          event: 'login_blocked',
          userId: user.id,
          reason: 'user_locked',
          details: {
            lockedUntil:
              user.lockedUntil,
          },
        });

        return res.status(423).json({
          code:
            'ERRORS.ACCOUNT_LOCKED',
          data: null,
        });
      }

      // Record failed attempts and escalate to lockout or restriction when needed.
      const passwordIsValid =
        await verify(
          user.password,
          password ?? '',
        );

      if (!passwordIsValid) {
        const {
          events,
          state,
        } =
          await user.registerFailedLogin(
            now,
          );

        if (
          events.includes('locked')
        ) {
          await auditAuthEvent(req, {
            event: 'user_locked',
            userId: user.id,
            reason:
              'failed_login_threshold',
            details: {
              lockedUntil:
                state.lockedUntil,
            },
          });
        }

        if (
          events.includes('restricted')
        ) {
          await auditAuthEvent(req, {
            event: 'user_restricted',
            userId: user.id,
            reason: 'daily_lockout',
            details: {
              strikeCount:
                state.bruteStrikeCount,
              windowStart:
                state.bruteWindowStart,
            },
          });
        }

        const attemptsLeft =
          events.includes('locked')
            ? 0
            : Math.max(
              0,
              SECURITY.FAILS_TO_LOCK -
              (
                state
                  .failedLoginCount ??
                0
              ),
            );

        await auditAuthEvent(req, {
          event: 'login_failed',
          userId: user.id,
          reason: 'bad_password',
          details: {
            attemptsLeft,
          },
        });

        return res.status(401).json({
          code:
            'ERRORS.INVALID_AUTHORIZATION',
          data: null,
        });
      }

      // Clear temporary login state and create a new session.
      await user.resetAfterSuccess();

      await resetKey(
        signInUserLimiter,
        userKey,
      );

      const {
        accessToken,
        refreshToken,
      } =
        await mintTokenPair(
          user,
          {
            ua: userAgent,
            ip: req.ip,
          },
        );

      setRefreshCookie(
        res,
        refreshToken,
      );

      await auditAuthEvent(req, {
        event: 'login_success',
        userId: user.id,
      });

      return res.status(200).json({
        data: {
          user: {
            id: user.id,
            userName:
              user.userName,
            firstName:
              user.firstName,
            lastName:
              user.lastName,
            roleName:
              user.role?.name ??
              null,
            roleId:
              user.roleId ?? null,
          },
          token: accessToken,
          expiresIn:
            ACCESS_TTL_SEC,
        },
      });
    } catch (error) {
      error.code =
        error.code ??
        'ERRORS.UNAUTHORIZED';

      return next(error);
    }
  },
);

// Rotate the refresh token atomically so the old token cannot be reused.
router.post(
  '/refresh',
  async (req, res, next) => {
    try {
      const raw =
        req.cookies?.rt;

      if (!raw) {
        return res.status(401).json({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      let payload;

      try {
        payload =
          verifyRefreshToken(raw);
      } catch {
        clearRefreshCookie(res);

        return res.status(401).json({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      const userId =
        Number(payload?.sub);

      const jti =
        payload?.jti;

      if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        typeof jti !== 'string' ||
        !jti
      ) {
        clearRefreshCookie(res);

        return res.status(401).json({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      const user =
        await User.findByPk(
          userId,
          {
            attributes: [
              'id',
              'userName',
              'firstName',
              'lastName',
              'roleId',
              'isRestricted',
            ],
            include: [
              {
                model: Role,
                attributes: [
                  'id',
                  'name',
                ],
              },
            ],
          },
        );

      if (!user) {
        clearRefreshCookie(res);

        return res.status(401).json({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      if (user.isRestricted) {
        await auditAuthEvent(req, {
          event: 'refresh_failed',
          userId: user.id,
          reason: 'user_restricted',
        });

        clearRefreshCookie(res);

        return res.status(401).json({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      // Lock the current refresh-token row to prevent concurrent reuse.
      const result =
        await sequelize.transaction(
          async (transaction) => {
            const tokenRow =
              await RefreshToken.findOne({
                where: {
                  id: jti,
                  userId,
                },
                transaction,
                lock:
                  transaction
                    .LOCK.UPDATE,
              });

            if (!tokenRow) {
              return {
                ok: false,
                reason:
                  'token_not_found',
              };
            }

            const now =
              new Date();

            let invalidReason = null;

            if (tokenRow.revokedAt) {
              invalidReason =
                'token_revoked';
            } else if (
              tokenRow.rotatedAt
            ) {
              invalidReason =
                'token_rotated';
            } else if (
              new Date(
                tokenRow.expiresAt,
              ) <= now
            ) {
              invalidReason =
                'token_expired';
            }

            if (invalidReason) {
              return {
                ok: false,
                reason:
                  invalidReason,
              };
            }

            const {
              accessToken,
              refreshToken,
            } =
              await mintTokenPair(
                user,
                {
                  ua:
                    req.get(
                      'user-agent',
                    ) ?? null,
                  ip: req.ip,
                  transaction,
                },
              );

            const newPayload =
              jwt.decode(
                refreshToken,
              );

            const newJti =
              newPayload?.jti;

            if (
              typeof newJti !==
              'string' ||
              !newJti
            ) {
              throw new Error(
                'Invalid refresh token jti',
              );
            }

            tokenRow.rotatedAt =
              now;

            tokenRow.replacedByTokenId =
              newJti;

            await tokenRow.save({
              transaction,
            });

            return {
              ok: true,
              accessToken,
              refreshToken,
            };
          },
        );

      if (!result.ok) {
        await auditAuthEvent(req, {
          event: 'refresh_failed',
          userId,
          reason: result.reason,
        });

        clearRefreshCookie(res);

        return res.status(401).json({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      setRefreshCookie(
        res,
        result.refreshToken,
      );

      return res.status(200).json({
        data: {
          accessToken:
            result.accessToken,
          expiresIn:
            ACCESS_TTL_SEC,
        },
      });
    } catch (error) {
      error.code =
        error.code ??
        'ERRORS.UNAUTHORIZED';

      return next(error);
    }
  },
);

// Revoke the current refresh token and clear the browser cookie.
router.post(
  '/sign-out',
  async (req, res, next) => {
    try {
      const raw =
        req.cookies?.rt;

      clearRefreshCookie(res);

      if (raw) {
        try {
          const payload =
            verifyRefreshToken(
              raw,
              {
                ignoreExpiration:
                  true,
              },
            );

          if (
            typeof payload?.jti ===
            'string' &&
            payload.jti
          ) {
            const tokenRow =
              await RefreshToken.findOne({
                where: {
                  id: payload.jti,
                },
              });

            if (
              tokenRow &&
              !tokenRow.revokedAt
            ) {
              tokenRow.revokedAt =
                new Date();

              await tokenRow.save();
            }
          }
        } catch {
          // Invalid refresh tokens do not block sign-out.
        }
      }

      return res.status(200).json({
        data: null,
      });
    } catch (error) {
      error.code =
        error.code ??
        'ERRORS.UNAUTHORIZED';

      return next(error);
    }
  },
);

// Return the current authenticated user's basic profile.
router.get(
  '/me',
  requireAuth,
  async (req, res, next) => {
    try {
      const user =
        await User.findByPk(
          req.user.id,
          {
            attributes: [
              'id',
              'userName',
              'firstName',
              'lastName',
              'roleId',
            ],
            include: [
              {
                model: Role,
                attributes: [
                  'id',
                  'name',
                ],
              },
            ],
          },
        );

      if (!user) {
        return res.status(401).json({
          code: 'ERRORS.UNAUTHORIZED',
          data: null,
        });
      }

      return res.status(200).json({
        data: {
          id: user.id,
          userName:
            user.userName,
          firstName:
            user.firstName,
          lastName:
            user.lastName,
          roleName:
            user.role?.name ?? null,
          roleId:
            user.roleId ?? null,
        },
      });
    } catch (error) {
      error.code =
        error.code ??
        'ERRORS.UNAUTHORIZED';

      return next(error);
    }
  },
);

export default router;
