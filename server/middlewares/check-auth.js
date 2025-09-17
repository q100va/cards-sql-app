// ESM
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

// Обязательная аутентификация: 401 при любой проблеме с access-токеном
export default function requireAuth(req, res, next) {
  try {
    // пропускаем preflight
    if (req.method === 'OPTIONS') return next();

    const auth = req.headers['authorization'] || '';
    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
    }

    const payload = jwt.verify(token, ACCESS_SECRET, {
      issuer: 'cards-sql-app',
      audience: 'web',
    });

    // прокидываем в req данные пользователя (то, что клали в access)
    req.user = {
      id: Number(payload.sub),
      userName: payload.uname,
      role: payload.role ?? null,
    };

    return next();
  } catch (err) {
    // access просрочен/битый/нет — отдаём 401.
    // Клиентский интерсептор сам вызовет /api/session/refresh и переиграет запрос.
    return res.status(401).json({ code: 'ERRORS.UNAUTHORIZED', data: null });
  }
}

// Опциональная аутентификация (если нужно): не валит запрос, просто ставит req.user при наличии токена
export function optionalAuth(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const [scheme, token] = auth.split(' ');
    if (scheme === 'Bearer' && token) {
      const payload = jwt.verify(token, ACCESS_SECRET, {
        issuer: 'cards-sql-app',
        audience: 'web',
      });
      req.user = {
        id: Number(payload.sub),
        userName: payload.uname,
        role: payload.role ?? null,
      };
    }
  } catch {
    // игнорим ошибки — это "optional"
  } finally {
    next();
  }
}
