import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../models/index.js';

const DEFAULT_ACCESS_TTL_SEC = 15 * 60;
const DEFAULT_REFRESH_TTL_SEC =
  30 * 24 * 60 * 60;

function getPositiveIntegerEnv(
  value,
  fallback,
) {
  const parsed = Number.parseInt(
    value ?? '',
    10,
  );

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

export const ACCESS_TTL_SEC =
  getPositiveIntegerEnv(
    process.env.JWT_ACCESS_TTL_SEC,
    DEFAULT_ACCESS_TTL_SEC,
  );

const REFRESH_TTL_SEC =
  getPositiveIntegerEnv(
    process.env.JWT_REFRESH_TTL_SEC,
    DEFAULT_REFRESH_TTL_SEC,
  );

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET;

export const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    'JWT secrets are not configured',
  );
}

const isProd =
  process.env.NODE_ENV === 'production';

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd
    ? 'none'
    : 'lax',
  path: '/api/session',
};

export function setRefreshCookie(
  res,
  token,
) {
  res.cookie('rt', token, {
    ...refreshCookieOptions,
    maxAge:
      REFRESH_TTL_SEC * 1000,
  });
}

export function clearRefreshCookie(
  res,
) {
  res.clearCookie(
    'rt',
    refreshCookieOptions,
  );
}

const signAccess = (payload) =>
  jwt.sign(
    payload,
    ACCESS_SECRET,
    {
      algorithm: 'HS256',
      expiresIn:
        ACCESS_TTL_SEC,
      issuer: 'cards-sql-app',
      audience: 'web',
    },
  );

const signRefresh = (payload) =>
  jwt.sign(
    payload,
    REFRESH_SECRET,
    {
      algorithm: 'HS256',
      expiresIn:
        REFRESH_TTL_SEC,
      issuer: 'cards-sql-app',
      audience: 'web',
    },
  );

function assertUserHasRole(user) {
  const roleName =
    user?.role?.name;

  if (
    typeof roleName !== 'string' ||
    roleName.trim() === ''
  ) {
    const error =
      new Error(
        'ERRORS.USER_WITHOUT_ROLE',
      );

    error.code =
      'ERRORS.USER_WITHOUT_ROLE';

    error.status = 500;

    throw error;
  }

  return roleName;
}

export async function mintTokenPair(
  user,
  {
    ua = null,
    ip = null,
    transaction = undefined,
  } = {},
) {
  const roleName =
    assertUserHasRole(user);

  const jti = uuidv4();
  const now = new Date();

  const refresh =
    await RefreshToken.create(
      {
        id: jti,
        userId: user.id,
        userAgent: ua,
        ip,
        expiresAt:
          new Date(
            now.getTime() +
              REFRESH_TTL_SEC *
                1000,
          ),
      },
      {
        transaction,
      },
    );

  const accessToken =
    signAccess({
      sub: String(user.id),
      uname: user.userName,
      role: roleName,
      roleId: user.roleId,
    });

  const refreshToken =
    signRefresh({
      sub: String(user.id),
      uname: user.userName,
      role: roleName,
      roleId: user.roleId,
      jti: refresh.id,
    });

  return {
    accessToken,
    refreshToken,
  };
}
