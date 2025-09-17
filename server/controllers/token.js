// server/controllers/token.js
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../models/index.js';

// === настройки/секреты ===
export const ACCESS_TTL_SEC = Number(process.env.JWT_ACCESS_TTL_SEC ?? 900);        // 15m
const REFRESH_TTL_SEC = Number(process.env.JWT_REFRESH_TTL_SEC ?? 60 * 60 * 24 * 30); // 30d
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
export const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  // упадём рано, чтобы не запускаться без секретов
  // eslint-disable-next-line no-console
  console.error('[session-api] JWT secrets are not configured');
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

// cookie с refresh токеном
export const setRefreshCookie = (res, token) => {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/session',        // чтобы не слал лишнего
    maxAge: REFRESH_TTL_SEC * 1000,
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie('rt', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/session',
  });
};

// sign helpers
const signAccess = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL_SEC,
    issuer: 'cards-sql-app',
    audience: 'web',
  });

const signRefresh = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TTL_SEC,
    issuer: 'cards-sql-app',
    audience: 'web',
  });

function assertUserHasRole(user) {
  const roleName = user?.role?.name;
  if (typeof roleName !== 'string' || roleName.trim() === '') {
    const err = new Error('ERRORS.USER_WITHOUT_ROLE');
    err.code = 'ERRORS.USER_WITHOUT_ROLE';
    err.status = 500;
    throw err;
  }
  return roleName;
}

// Создаёт новую пару токенов + запись в БД для refresh
export async function mintTokenPair(user, ctx = {}) {
  const roleName = assertUserHasRole(user);
  const jti = uuidv4();
  const now = new Date();
  const refresh = await RefreshToken.create({
    id: jti,
    userId: user.id,
    userAgent: ctx.ua ?? null,
    ip: ctx.ip ?? null,
    expiresAt: new Date(now.getTime() + REFRESH_TTL_SEC * 1000),
  });

  const accessToken = signAccess({
    sub: String(user.id),
    uname: user.userName,
    role: roleName,
  });

  const refreshToken = signRefresh({
    sub: String(user.id),
    jti: refresh.id,
  });

  return { accessToken, refreshToken };

}
