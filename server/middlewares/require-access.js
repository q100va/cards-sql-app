// server/middlewares/require-access.js
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

export function requireAccess(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const [, token] = h.split(' ');
    if (!token) return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });

    const payload = jwt.verify(token, ACCESS_SECRET, { issuer: 'cards-sql-app', audience: 'web' });
    req.user = { id: Number(payload.sub), userName: payload.uname, roleName: payload.role ?? null };
    next();
  } catch {
    return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
  }
}
