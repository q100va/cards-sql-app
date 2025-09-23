// ESM
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const VERIFY_OPTS = {
  issuer: 'cards-sql-app',
  audience: 'web',
  algorithms: ['HS256'],   // ✅ зафиксировали алгоритм
  clockTolerance: 15,      // ✅ +/- 15s на дрейф часов
};

function badAuth(res) {
  return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
}

export function requireAuth(req, res, next) {
  try {
    if (req.method === 'OPTIONS') return next();

    if (!ACCESS_SECRET) return badAuth(res);

    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);   // ✅ case-insensitive
    const token = m?.[1];
    if (!token) return badAuth(res);

    const payload = jwt.verify(token, ACCESS_SECRET, VERIFY_OPTS);

    // валидация критичных полей
    const subNum = Number(payload.sub);
    const roleIdNum = Number(payload.roleId);
    if (!Number.isFinite(subNum) || !Number.isFinite(roleIdNum)) {
      return badAuth(res);
    }

    req.user = {
      id: subNum,
      userName: payload.uname,
      role: payload.role,
      roleId: roleIdNum,
    };

    return next();
  } catch {
    return badAuth(res);
  }
}

export function optionalAuth(req, res, next) {
  try {
    if (!ACCESS_SECRET) return next();

    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1];
    if (token) {
      const payload = jwt.verify(token, ACCESS_SECRET, VERIFY_OPTS);
      const subNum = Number(payload.sub);
      const roleIdNum = payload.roleId != null ? Number(payload.roleId) : null;

      if (Number.isFinite(subNum)) {
        req.user = {
          id: subNum,
          userName: payload.uname ?? null,
          role: payload.role ?? null,
          roleId: Number.isFinite(roleIdNum) ? roleIdNum : null,
        };
      }
    }
  } catch {
    // игнорим — optional
  } finally {
    next();
  }
}

export default requireAuth;
