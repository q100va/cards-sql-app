import jwt from 'jsonwebtoken';
import {
  setRequestUserId,
} from './request-context.js';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET;

const VERIFY_OPTS = {
  issuer: 'cards-sql-app',
  audience: 'web',
  algorithms: ['HS256'],
  clockTolerance: 15,
};

function badAuth(res) {
  return res.status(401).json({
    code: 'ERRORS.UNAUTHORIZED',
    data: null,
  });
}

function getBearerToken(req) {
  const authorization =
    req.headers.authorization ?? '';

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i,
    );

  return match?.[1] ?? null;
}

export function requireAuth(
  req,
  res,
  next,
) {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }

    if (!ACCESS_SECRET) {
      return badAuth(res);
    }

    const token =
      getBearerToken(req);

    if (!token) {
      return badAuth(res);
    }

    const payload = jwt.verify(
      token,
      ACCESS_SECRET,
      VERIFY_OPTS,
    );

    const userId =
      Number(payload.sub);

    const roleId =
      Number(payload.roleId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(roleId) ||
      roleId <= 0
    ) {
      return badAuth(res);
    }

    req.user = {
      id: userId,
      userName:
        payload.uname ?? null,
      role:
        payload.role ?? null,
      roleId,
    };

    setRequestUserId(userId);

    return next();
  } catch {
    return badAuth(res);
  }
}

export function optionalAuth(
  req,
  _res,
  next,
) {
  try {
    if (!ACCESS_SECRET) {
      return;
    }

    const token =
      getBearerToken(req);

    if (!token) {
      return;
    }

    const payload = jwt.verify(
      token,
      ACCESS_SECRET,
      VERIFY_OPTS,
    );

    const userId =
      Number(payload.sub);

    const roleId =
      payload.roleId != null
        ? Number(payload.roleId)
        : null;

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return;
    }

    req.user = {
      id: userId,
      userName:
        payload.uname ?? null,
      role:
        payload.role ?? null,
      roleId:
        Number.isInteger(roleId) &&
        roleId > 0
          ? roleId
          : null,
    };

    setRequestUserId(userId);
  } catch {
    // Invalid authentication is ignored for optional access.
  } finally {
    next();
  }
}

export default requireAuth;
